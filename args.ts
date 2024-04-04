import type { ServeOptions } from './options';
import type { ImportGlobalsPluginOptions } from './plugins';


export interface CommandlineArgs {
    importGlobalsPluginOptions?: ImportGlobalsPluginOptions;
    serveOptions?: ServeOptions;
}


function readArg(name: string, args: string[]): number | never {
    const idx = args.indexOf(name);
    if (idx >= 0) {
        args.splice(idx, 1);
        return idx;
    }
    throw new Error('Missing argument: ' + name);
}


function readValueArg(name: string, args: string[]): string | never {
    const idx = readArg(name, args);
    if (idx < args.length) {
        return args.splice(idx, 1)[0];
    }
    throw new Error('Missing value for argument: ' + name);
}


function carefully<T>(fn: () => T, fallback: T, silent = true): T {
    try {
        return fn();
    } catch (error) {
        if (!silent) {
            console.error(error);
        }
    }
    return fallback;
}


export function readBuildArgs(into: CommandlineArgs, args: string[]): void {
    if (into.serveOptions) {
        into.serveOptions.host = carefully(() => readValueArg('--host', args), into.serveOptions.host);
        into.serveOptions.port = carefully(() => readValueArg('--port', args), into.serveOptions.port);
    }
    if (into.importGlobalsPluginOptions) {
        into.importGlobalsPluginOptions.extern = carefully(() => readArg('--extern', args) >= 0, false);
        if (into.importGlobalsPluginOptions.extern) {
            into.importGlobalsPluginOptions.import = args
                .map(arg => arg.split('|'))
                .filter(split => {
                    if (split.length !== 3) {
                        console.error('Invalid argument:', split.join('|'));
                        return false;
                    }
                    return true;
                })
                .reduce((object: ImportGlobalsPluginOptions['import'], [key, name, src]) => {
                    object[key] = { name, src };
                    return object;
                }, {});
        }
    }
}
