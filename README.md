# Type-Bundler

The type-bundler pipeline uses the `esbuild` api to bundle a typescript application for the web. Its main scripts, `build.ts` and `serve.ts`, should be executed with `bun`, a javascript runtime engine natively supporting typescript. The typescript compiler `tsc` is used for type checking the code the same way, it is checked by the vscode editor.

With the bundling options defined in `options.ts`, the `build.ts` script reads the files in the directory specified in the `outbase` option (default: `src`), bundles them and writes the bundled code to the directory specified in the `outdir` option (default: `out`). By default, it also minifies the bundled code and generates a source map for each file specified in the `entryPoints` option (default: `src/index.ts`). The `inject` option (default: `src/inject.ts`) can be used to unconditionally inject code into the bundled application, independent of whether or not the file is actually imported somewhere in the code.

The `serve.ts` script serves the bundled application on a local server and automatically rebuilds the application when reloading the served page. It uses the same options as the `build.ts` script, but also accepts the `host` and `port` options (default: `localhost` and `8000`, respectively) to specify the host and port of the local server.

## Installation

The type-bundler pipeline requires the `bun` runtime engine to be installed on the system. Furthermore, the following packages (dev dependencies) need to be installed in the project's `node_modules` directory:

```bash
npm install --save-dev bun-types esbuild typescript
```

## Usage

To include the type-bundler pipeline in a project, the following scripts can be added to the project's `package.json` file or directly executed from the command line:

```json
"scripts": {
    "build": "bun typebundler/build.ts",
    "build-extern": "npm run build -- --extern import|name|src",
    "serve": "bun typebundler/serve.ts",
    "serve-extern": "npm run serve -- --extern import|name|src"
}
```
Additional arguments to `npm run build` and `npm run serve` are passed after the `--` delimiter. Here, the `--extern` flag is used to bundle the application with an external dependency (see next section for more information about the format).

## Command line arguments

The `build.ts` and `serve.ts` scripts accept the following command line arguments:
- `--host`: Host of the local server, defaults to `localhost`
- `--port`: Port of the local server, defaults to `8000`
- `--extern`: This flag is used to bundle the application with external dependencies

With the `extern` flag set, all other arguments are treated as external dependencies and as such are not bundled into the code. The format for an external dependency is defined as: `import|name|src`, where `import` is the package the dependency is normally imported from, `name` is the name of the import and the global variable in the code, and `src` is the url of the external dependency that defines the global variable.
For example, the following command bundles the application with the external `playcanvas` dependency:
```bash
    bun typebundler/build.ts --extern playcanvas|pc|https://code.playcanvas.com/playcanvas-stable.js
```

## Plugins
The plugins are used to extend the functionality of the `esbuild` api. The following plugins are available:

- `check-types`: Runs the typescript compiler `tsc` in order to type-check the code before building.

- `check-linter`: [ NOT IMPLEMENTED ]: Runs `eslint`, if a configuration file is present.

- `delete-files`: Deletes the files specified in the `DeleteFilesPluginOptions` from the file system. This is useful for cleaning up the `outdir` directory before writing the new files.

- `read-files`: Reads the content of the files specified in the `ReadFilesPluginOptions` and stores it in the `content` property of each bundle-file object for later use.

- `build-info`: Prints the name and size of the files specified in the `BuildTimePluginOptions` and computes the time it took to bundle the files.

- `import-globals`: Automatically imports global variables specified in the `ImportGlobalsPluginOptions` into the code. If the `extern` flag is set, the `html` files found in the `outbase` directory are updated in order to include `script` tags at the end of the `<head>` tag pointing to the `src` value of each external dependency.

- `write-files`: Writes the content of the files specified in the `WriteFilesPluginOptions` to the file system. By default, this includes the generated code, its source maps, and any `html` file found in the `outbase` directory. The `html` files are automatically updated in order to include a  `script` tag at the end of the `<body>` tag pointing to the generated code bundle.
