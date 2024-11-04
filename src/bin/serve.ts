import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { FSWatcher } from 'chokidar';
import type { Server } from 'http';
import { startServer } from '../lib/serve.js';
import { watchAndCreate } from '../lib/create.js';
import { exit } from './utils.js';

interface ServeOptions {
    port: string;
    url: string;
    outputFile?: string;
    format?: 'wacz' | 'warc' | 'files';
}

export async function serveCommand(archiveFile: string, options: ServeOptions) {
    const { replayFile, watcher, tempPrefix } = await setupArchiveFile(archiveFile, options);

    // Start the server
    const port = parseInt(options.port);
    const server = await startServer(replayFile, options.url, port);
    console.log(chalk.green(`Server running at http://localhost:${port}/`));

    // Handle graceful shutdown
    setupCleanup(server, watcher, tempPrefix);
}

async function setupArchiveFile(archiveFile: string, options: ServeOptions) {
    let replayFile = archiveFile;
    let watcher: FSWatcher | undefined;
    let tempPrefix: string | undefined;

    const isDirectory = fs.lstatSync(archiveFile).isDirectory();
    
    if (isDirectory) {
        const { suffix, asFiles } = determineArchiveFormat(archiveFile, options.format);
        
        // Create unique temp file path
        tempPrefix = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wacz-serve-'));
        replayFile = options.outputFile || path.join(tempPrefix, `archive${suffix}`);
        
        console.log(chalk.blue(`Building initial archive from ${asFiles ? 'files' : suffix === '.wacz' ? 'WACZ' : 'WARC'} ...`));
        watcher = await watchAndCreate(archiveFile, replayFile, asFiles);
    }

    return { replayFile, watcher, tempPrefix };
}

function determineArchiveFormat(archiveFile: string, format?: string) {
    let suffix = '.warc.gz';
    let asFiles = false;
    
    if (format) {
        if (format === 'wacz') {
            suffix = '.wacz';
        } else if (format === 'files') {
            asFiles = true;
        }
    } else {
        if (fs.existsSync(path.join(archiveFile, 'datapackage.json'))) {
            suffix = '.wacz';
        } else if (
            !fs.existsSync(path.join(archiveFile, 'http:')) &&
            !fs.existsSync(path.join(archiveFile, 'https:')) &&
            !fs.existsSync(path.join(archiveFile, 'file:'))
        ) {
            asFiles = true;
        }
    }

    return { suffix, asFiles };
}

function setupCleanup(server: Server, watcher?: FSWatcher, tempPrefix?: string) {
    process.on('SIGINT', async () => {
        await server.close();
        if (watcher) {
            await watcher.close();
        }
        if (tempPrefix && fs.existsSync(tempPrefix)) {
            try {
                fs.rmSync(tempPrefix, { recursive: true, force: true });
            } catch (err) {
                console.error(chalk.yellow('Failed to clean up temporary files:', err));
            }
        }
        exit('\nServer stopped');
    });
} 