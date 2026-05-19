/**
 * CodeSync — WebContainers Integration
 *
 * @webcontainer/api boots a full Node.js runtime in the browser (Chromium-only).
 * Used for: running npm scripts, starting dev servers, executing tests — without
 * any server-side sandbox (Judge0 handles arbitrary languages; WebContainers
 * handles Node.js-specific workflows like `npm run dev`).
 *
 * Architecture:
 *   WebContainer (singleton) → mount files → spawn processes → stream stdout/stderr
 *
 * Skill coverage: WebAssembly (WebContainers uses WASM internally), in-browser Node.js
 */

import { WebContainer } from "@webcontainer/api";

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Boot the WebContainer singleton.
 * Only one instance is allowed per page (enforced by the API).
 * Call this once on component mount, cache the result.
 */
export async function bootWebContainer(): Promise<WebContainer> {
    if (webcontainerInstance) return webcontainerInstance;

    // Prevent concurrent boots — share the same promise
    if (bootPromise) return bootPromise;

    bootPromise = WebContainer.boot().then((instance) => {
        webcontainerInstance = instance;
        return instance;
    });

    return bootPromise;
}

export function getWebContainerInstance(): WebContainer | null {
    return webcontainerInstance;
}

/**
 * Mount a flat file map into the container's filesystem.
 * fileMap shape: { "index.js": "console.log('hi')", "package.json": "{...}" }
 */
export async function mountFiles(
    container: WebContainer,
    fileMap: Record<string, string>
): Promise<void> {
    const files: Record<string, { file: { contents: string } }> = {};
    for (const [path, contents] of Object.entries(fileMap)) {
        files[path] = { file: { contents } };
    }
    await container.mount(files);
}

/**
 * Run a shell command and stream stdout/stderr to provided callbacks.
 * Returns the exit code.
 */
export async function runCommand(
    container: WebContainer,
    command: string,
    args: string[],
    opts: {
        onOutput?: (chunk: string) => void;
        onError?: (chunk: string) => void;
    } = {}
): Promise<number> {
    const process = await container.spawn(command, args);

    process.output.pipeTo(
        new WritableStream({
            write(chunk) {
                opts.onOutput?.(chunk);
            },
        })
    );

    return process.exit;
}

/**
 * Install npm dependencies inside the container.
 * Streams install log to onOutput.
 */
export async function installDependencies(
    container: WebContainer,
    opts: { onOutput?: (chunk: string) => void } = {}
): Promise<void> {
    const exitCode = await runCommand(container, "npm", ["install"], opts);
    if (exitCode !== 0) {
        throw new Error(`npm install failed with exit code ${exitCode}`);
    }
}

/**
 * Start a dev server inside the container and resolve when ready.
 * Returns the server URL (e.g., "http://localhost:3000").
 */
export async function startDevServer(
    container: WebContainer,
    opts: { onOutput?: (chunk: string) => void } = {}
): Promise<string> {
    return new Promise(async (resolve, reject) => {
        // Listen for the server-ready event BEFORE spawning the process
        container.on("server-ready", (port, url) => {
            resolve(url);
        });

        const exitCode = await runCommand(container, "npm", ["run", "dev"], opts);
        if (exitCode !== 0) {
            reject(new Error(`Dev server exited with code ${exitCode}`));
        }
    });
}

/**
 * Write a single file into the running container.
 * Used for live file sync from the Monaco editor.
 */
export async function writeFile(
    container: WebContainer,
    path: string,
    contents: string
): Promise<void> {
    await container.fs.writeFile(path, contents);
}

/**
 * Read a file from the container's filesystem.
 */
export async function readFile(
    container: WebContainer,
    path: string
): Promise<string> {
    return container.fs.readFile(path, "utf-8");
}
