import esbuild from 'esbuild';
import { readBuildArgs } from './args';
import { esbuildOptions, importGlobalsPluginOptions, type ServeOptions } from './options';
import { format } from './utils';


async function main(): Promise<void> {
    const serveOptions: ServeOptions = {
        host: 'localhost',
        port: '8000'
    };
    readBuildArgs({ importGlobalsPluginOptions, serveOptions }, process.argv.slice(2));

    // start esbuild server (automatically rebuilds on request)
    const ctx = await esbuild.context(esbuildOptions);
    console.log('\nserve:', format.style.underline(`http://${serveOptions.host}:${serveOptions.port}/`));
    await ctx.serve({ host: serveOptions.host, port: Number(serveOptions.port), servedir: 'out' });

    // wait for interrupt signal to dispose esbuild context
    await new Promise<void>(resolve => void process.on('SIGINT', resolve));
    console.log('\ninterrupt signal received, closing server...');
    await ctx.dispose();
}

void main();
