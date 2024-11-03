#!/usr/bin/env node

import { Command, Option } from 'commander';
import chalk from 'chalk';
import { hasFiles } from '../lib/utils.js';
import type { FSWatcher } from 'chokidar';
import fs from 'fs';
const program = new Command();

function exit(message: string, code: number = 0) {
    if (code === 0) {
        console.log(chalk.green(message));
    } else {
        console.error(chalk.red(message));
    }
    process.exit(code);
}

program
    .version('0.0.1')
    .description('Read and write WACZ files as folders');

program
    .command('extract')
    .description('Extract a WACZ or WARC file to a directory')
    .argument('<inputFile>', 'Path to the WACZ/WARC file to extract')
    .argument('<outputDir>', 'Directory to extract the contents to')
    .option('--delete-existing', 'Delete the entire output directory if it exists')
    .action(async (inputFile, outputDir, options) => {
        const { extractArchive } = await import('../lib/extract.js');

        // Check if directory exists and has files
        if (fs.existsSync(outputDir)) {
            // check if path is a file rather than a directory
            if (fs.lstatSync(outputDir).isFile()) {
                return exit('Output path is a file rather than a directory.', 1);
            }

            if (await hasFiles(outputDir)) {
                if (options.deleteExisting) {
                    fs.rmSync(outputDir, { recursive: true, force: true });
                } else {
                    return exit(`Output directory "${outputDir}" is not empty. Use --delete-existing flag to delete the entire directory and its contents before extraction.`, 1);
                }
            }
        }
        
        await extractArchive(inputFile, outputDir);
        
        return exit(`Successfully extracted ${inputFile} to ${outputDir}`);
    });

program
    .command('create')
    .description('Create a WACZ or WARC file from a directory')
    .argument('<inputDir>', 'Directory containing archive contents')
    .argument('<outputFile>', 'Path where the archive file should be created')
    .option('-w, --watch', 'Watch input directory and rebuild archive on changes')
    .option('--as-files', 'Treat all files as file:// URLs instead of http(s):// URLs')
    .action(async (inputDir, outputFile, options) => {
        const { createArchive, watchAndCreate } = await import('../lib/create.js');
        
        if (options.watch) {
            console.log(chalk.blue(`Building initial archive from ${inputDir}...`));
            const watcher = await watchAndCreate(inputDir, outputFile, options.asFiles);
            
            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                await watcher.close();
                exit('\nWatcher stopped');
            });
        } else {
            await createArchive(inputDir, outputFile, options.asFiles);
            return exit(`Successfully created ${outputFile} from ${inputDir}`);
        }
    });

program
    .command('serve')
    .description('Serve a WACZ or WARC file via HTTP')
    .argument('<archiveFile>', 'Path to the WACZ/WARC file or directory to serve')
    .option('-p, --port <number>', 'Port to run the server on', '8080')
    .option('-u, --url <url>', 'URL to start at', '')
    .option('-o, --output-file <outputFile>', 'Store compiled archive to a file')
    .addOption(
        new Option('-f, --format <type>', 'Force archive format for directories')
        .choices(['wacz', 'warc', 'files']))
    .action(async (archiveFile, options) => {
        const { startServer } = await import('../lib/serve.js');
        const { watchAndCreate } = await import('../lib/create.js');
        const path = await import('path');
        const os = await import('os');
        
        let replayFile = archiveFile;
        const isDirectory = fs.lstatSync(archiveFile).isDirectory();
        let watcher: FSWatcher | undefined;
        let tempPrefix: string | undefined;

        if (isDirectory) {
            let suffix = '.warc.gz';
            let asFiles = false;
            
            // if given a directory, we have to choose whether to treat it as an unpacked WACZ,
            // unpacked WARC, or a directory of files
            if (options.format) {
                // if format is given, use it to determine the archive format
                if (options.format === 'wacz') {
                    suffix = '.wacz';
                } else if (options.format === 'files') {
                    asFiles = true;
                }
            } else {
                // if no format is given, try to guess the archive format based on the directory contents
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

            // Create unique temp file path
            tempPrefix = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wacz-serve-'));
            if (options.outputFile) {
                replayFile = options.outputFile;
            } else {
                replayFile = path.join(tempPrefix, `archive${suffix}`);
            }
            
            console.log(chalk.blue(`Building initial archive from ${asFiles ? 'files' : suffix === '.wacz' ? 'WACZ' : 'WARC'} ...`));
            watcher = await watchAndCreate(archiveFile, replayFile, asFiles);
        }

        // Start the server
        const port = parseInt(options.port);
        const server = await startServer(replayFile, options.url, port);
        console.log(chalk.green(`Server running at http://localhost:${port}/`));

        // Handle graceful shutdown
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
    });

program.parse();