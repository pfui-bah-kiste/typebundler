import type esbuild from 'esbuild';
import ts from 'typescript';
import { InsertionMode, format, stringInsertion } from './utils';


export interface BuildFile {
    srcPath: string;
    dstPath: string;
    content: string;
}


export function checkTypesPlugin(): esbuild.Plugin {
    return {
        name: 'check-types',
        setup(build: esbuild.PluginBuild): void {
            build.onStart(() => {
                const configFile = ts.findConfigFile('./', filename => ts.sys.fileExists(filename));
                if (configFile === undefined) {
                    throw new Error('Failed to find tsconfig.json');
                }
                const config = ts.getParsedCommandLineOfConfigFile(configFile, {}, {
                    ...ts.sys,
                    onUnRecoverableConfigFileDiagnostic: (): void => {
                        throw new Error('Failed to parse tsconfig.json');
                    }
                });
                if (config) {
                    const program = ts.createProgram(config.fileNames, config.options);
                    const diagnostics = ts.getPreEmitDiagnostics(program);
                    if (diagnostics.length > 0) {
                        throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
                            getCanonicalFileName: path => path,
                            getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
                            getNewLine: () => ts.sys.newLine
                        }));
                    }
                }
            });
        }
    };
}


export interface DeleteFilesPluginOptions {
    files: BuildFile[];
}


export function deleteFilesPlugin(options: DeleteFilesPluginOptions): esbuild.Plugin {
    return {
        name: 'delete-files',
        setup(build: esbuild.PluginBuild): void {
            build.onStart(() =>
                options.files.forEach(file =>
                    ts.sys.deleteFile?.(file.dstPath)
                )
            );
        }
    };
}


export interface ReadFilesPluginOptions {
    files: BuildFile[];
}


export function readFilesPlugin(options: ReadFilesPluginOptions): esbuild.Plugin {
    return {
        name: 'read-files',
        setup(build: esbuild.PluginBuild): void {
            build.onStart(() => {
                options.files.forEach(file => {
                    file.content = ts.sys.readFile(file.srcPath) ?? '';
                });
            });
        }
    };
}


export interface BuildInfoPluginOptions {
    files: BuildFile[];
}


export function buildInfoPlugin(options: BuildInfoPluginOptions): esbuild.Plugin {

    const fileInfo = (path: string): string => {
        const size = ts.sys.getFileSize?.(path) ?? 0;
        const sizes = {
            get GB(): number {
                return this.MB * 1024;
            },
            get MB(): number {
                return this.kB * 1024;
            },
            get kB(): number {
                return 1024;
            }
        };
        let unit: keyof typeof sizes;
        for (unit in sizes) {
            if (size > sizes[unit]) {
                return (size / sizes[unit]).toFixed(2) + unit;
            }
        }
        return size + 'bytes';
    };

    return {
        name: 'build-info',
        setup(build: esbuild.PluginBuild): void {
            let startTime: Date;

            build.onStart(() => {
                startTime = new Date();
                console.log();
            });

            build.onEnd(() => {
                const now = new Date();
                console.log('build time:', now.toLocaleDateString(), now.toLocaleTimeString());
                options.files
                    .filter(file => ts.sys.fileExists(file.dstPath))
                    .forEach(file =>
                        console.log(
                            format.style.dim(file.dstPath),
                            format.fg.blue(fileInfo(file.dstPath))
                        ));
                console.log(format.fg.green((+now - +startTime) + ' ms'));
            });
        }
    };
}


export interface ImportGlobalsPluginOptions {
    files: BuildFile[];
    extern: boolean;
    import: Record<string, {
        name: string;
        src: string;
    }>;
}


export function importGlobalsPlugin(options: ImportGlobalsPluginOptions): esbuild.Plugin {
    return {
        name: 'import-globals',
        setup(build: esbuild.PluginBuild): void {
            const imports = Object.entries(options.import);
            const paths = imports.filter(() => options.extern).map(([path]) => path);
            const regexp = paths.concat(paths.length === 0 ? '\\b' : [])
                .map(path => `^${path.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`)
                .join('|');
            const filter = new RegExp(regexp);
            const namespace = 'global-ns';
            console.log('[importGlobalsPlugin]:');
            console.log('extern =', options.extern);
            console.log('import = {');
            if (imports.length > 0) {
                console.log(imports.map(([path, {name, src}]) => `    ${name}: ${path} [${src}]`).join(',\n'));
            }
            console.log('}');

            build.onStart(() => {
                if (options.extern) {
                    options.files
                        .filter(file => file.dstPath.endsWith('.html'))
                        .forEach(file =>
                            Object.values(options.import).forEach(({src}) => {
                                file.content = stringInsertion(
                                    file.content,
                                    '</head>',
                                    '<script src="' + src + '"></script>',
                                    InsertionMode.Before
                                );
                            })
                        );
                }
            });

            build.onResolve({filter}, args => {
                if (!options.import[args.path].name) {
                    throw new Error('Unknown import: ' + args.path);
                }
                return {path: args.path, namespace};
            });

            build.onLoad({filter, namespace}, args =>
                ({contents: `module.exports = ${options.import[args.path].name};`, loader: 'js'})
            );
        }
    };
}


export interface WriteFilesPluginOptions {
    files: BuildFile[];
}


export function writeFilesPlugin(options: WriteFilesPluginOptions): esbuild.Plugin {
    return {
        name: 'write-files',
        setup(build: esbuild.PluginBuild): void {
            build.onStart(() => {
                options.files.forEach(file => {
                    // insert script tags sourcing js files to html files
                    if (file.dstPath.endsWith('.html')) {
                        options.files
                            .filter(otherFile => otherFile.dstPath.endsWith('.js'))
                            .forEach(otherFile => {
                                const src = otherFile.dstPath.replace(/.*\//, '');
                                file.content = stringInsertion(
                                    file.content,
                                    '</body>',
                                    '<script src="' + src + '"></script>',
                                    InsertionMode.Before
                                );
                            });
                    }
                    // write content to file
                    ts.sys.writeFile(file.dstPath, file.content);
                });
            });
        }
    };
}
