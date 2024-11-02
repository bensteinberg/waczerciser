#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { hasFiles } from '../lib/utils.js';

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
        const fs = await import('fs');
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
    .action(async (inputDir, outputFile) => {
        const { createArchive } = await import('../lib/create.js');
        await createArchive(inputDir, outputFile);
        return exit(`Successfully created ${outputFile} from ${inputDir}`);
    });

program
    .command('serve')
    .description('Serve a WACZ or WARC file via HTTP')
    .argument('<archiveFile>', 'Path to the WACZ/WARC file to serve')
    .option('-p, --port <number>', 'Port to run the server on', '8080')
    .option('-w, --watch <directory>', 'Watch source directory and rebuild archive on changes')
    .action(async (archiveFile, options) => {
        const { startServer } = await import('../lib/serve.js');
        const { createArchive } = await import('../lib/create.js');
        const path = await import('path');
        
        if (options.watch) {
            // If watch option is set, build the initial archive
            const chokidar = await import('chokidar');
            console.log(chalk.blue(`Building initial archive from ${options.watch}...`));
            await createArchive(options.watch, archiveFile);

            // Set up file watcher
            const watcher = chokidar.watch(options.watch, {
                ignored: /(^|[\/\\])\../, // ignore dotfiles. TODO: should we?
                persistent: true
            });

            // Watch for changes and rebuild the archive
            watcher.on('change', async (path) => {
                console.log(chalk.blue(`Changes detected in ${path}, rebuilding archive...`));
                await createArchive(options.watch, archiveFile);
                console.log(chalk.green('Archive rebuilt successfully'));
            });
        }

        // Start the server
        const port = parseInt(options.port);
        const server = await startServer(archiveFile, port);
        const embedUrl = `http://localhost:${port+1}/?source=file.warc&url=page:0`;
        console.log(chalk.green(`Server running at http://localhost:${port}/?url=${encodeURIComponent(embedUrl)}`));

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            await server.close();
            exit('\nServer stopped');
        });
    });

program.parse();