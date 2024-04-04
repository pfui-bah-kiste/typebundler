import type esbuild from 'esbuild';
import ts from 'typescript';
import type { BuildFile, BuildInfoPluginOptions, DeleteFilesPluginOptions, ImportGlobalsPluginOptions, ReadFilesPluginOptions, WriteFilesPluginOptions } from './plugins';
import { buildInfoPlugin, checkTypesPlugin, deleteFilesPlugin, importGlobalsPlugin, readFilesPlugin, writeFilesPlugin } from './plugins';


function trailingSlash(path: string): string {
    return path.endsWith('/') ? path : path + '/';
}

function commonPathPrefix(paths: string[]): string {
    const splitPaths = paths.map(path => path.split('/').slice(0, -1));
    return splitPaths
        .reduce((commonPath, splitPath) => commonPath.filter((segment, idx) => segment === splitPath[idx]), splitPaths[0])
        .concat('')
        .join('/');
}

export interface Native<T extends string | number | boolean> {
    value: T;
}

export interface ServeOptions {
    host: string;
    port: string;
}

export interface BuildOptions extends esbuild.BuildOptions {
    // unsupported options
    chunkNames?: never;
    entryNames?: never;

    // plugins
    files: BuildFile[];
    deleteFilesPluginOptions: DeleteFilesPluginOptions;
    readFilesPluginOptions: ReadFilesPluginOptions;
    buildInfoPluginOptions: BuildInfoPluginOptions;
    importGlobalsPluginOptions: ImportGlobalsPluginOptions;
    writeFilesPluginOptions: WriteFilesPluginOptions;
}

export const {
    files,
    deleteFilesPluginOptions,
    readFilesPluginOptions,
    buildInfoPluginOptions,
    importGlobalsPluginOptions,
    writeFilesPluginOptions,
    ...esbuildOptions
}: BuildOptions = {
    bundle: true,
    minify: true,
    sourcemap: true,
    logLevel: 'warning',
    legalComments: 'none',
    outbase: 'src/',
    outdir: 'out/',
    get entryPoints() {
        return [this.outbase + 'index.ts'];
    },
    get inject() {
        return [this.outbase + 'inject.ts']
            .filter(file => ts.sys.fileExists(file));
    },
    get files() {
        let paths: string[];
        let outbase = this.outbase ?? '';
        let outdir = this.outdir ?? '';
        // compile list of entry points
        const entryPoints = (
            this.entryPoints instanceof Array
                ? this.entryPoints
                : Object.values(this.entryPoints ?? {})
            ).map(entryPoint => entryPoint instanceof Object ? entryPoint.out : entryPoint);
        // use outbase, if it is set
        if (outbase.length > 0) {
            // ensure trailing slash
            outbase = trailingSlash(outbase);
        } else {
            // otherwise use common path prefix of all entry points
            outbase = commonPathPrefix(entryPoints);
        }
        // use outdir, if it is set
        if (outdir.length > 0) {
            // ensure trailing slash
            outdir = trailingSlash(outdir);
            // replace outbase with outdir
            paths = entryPoints.map(entryPoint => entryPoint.replace(outbase, outdir));
        } else {
            // esbuild guarantees that outfile is set, if outdir is not set
            paths = [this.outfile ?? ''];
            // set outdir to the prefix path of outfile
            outdir = commonPathPrefix(paths);
        }
        const buildFiles = paths.map<BuildFile>(path => ({
            srcPath: path,
            dstPath: path.replace(/\.tsx?$/, '.js'),
            content: ''
        }));
        // add sourcemaps, if esbuild is configured to generate them
        if (this.sourcemap === true || this.sourcemap === 'linked' || this.sourcemap === 'external' || this.sourcemap === 'both') {
            buildFiles.push(...buildFiles.map(({srcPath, dstPath}) => ({
                srcPath: srcPath,
                dstPath: dstPath + '.map',
                content: ''
            })));
        }
        // add html files, if any
        ts.sys.readDirectory(outbase, ['.html'], undefined, undefined, 0).forEach(file => {
            buildFiles.push({
                srcPath: file,
                dstPath: file.replace(outbase, outdir),
                content: ''
            });
        });
        return buildFiles;
    },
    get deleteFilesPluginOptions() {
        return { files };
    },
    get readFilesPluginOptions() {
        return { files };
    },
    get buildInfoPluginOptions() {
        return { files };
    },
    get importGlobalsPluginOptions() {
        return { files, extern: false, import: {} };
    },
    get writeFilesPluginOptions() {
        return { files };
    },
    get plugins() {
        return [
            checkTypesPlugin(),
            deleteFilesPlugin(deleteFilesPluginOptions),
            readFilesPlugin(readFilesPluginOptions),
            buildInfoPlugin(buildInfoPluginOptions),
            importGlobalsPlugin(importGlobalsPluginOptions),
            writeFilesPlugin(writeFilesPluginOptions)
        ];
    }
};
