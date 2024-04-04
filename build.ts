import esbuild from 'esbuild';
import { readBuildArgs } from './args';
import { esbuildOptions, importGlobalsPluginOptions } from './options';


async function main(): Promise<void> {
    readBuildArgs({ importGlobalsPluginOptions }, process.argv.slice(2));
    await esbuild.build(esbuildOptions);
}

void main();
