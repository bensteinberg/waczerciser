import chalk from 'chalk';
import type { FSWatcher } from 'chokidar';
import { createArchive, watchAndCreate } from '../lib/create.js';
import { exit } from './utils.js';

interface CreateOptions {
    watch?: boolean;
    asFiles?: boolean;
}

export async function createCommand(inputDir: string, outputFile: string, options: CreateOptions) {
    if (options.watch) {
        console.log(chalk.blue(`Building initial archive from ${inputDir}...`));
        const watcher = await watchAndCreate(inputDir, outputFile, options.asFiles);
        process.on('SIGINT', async () => {
            await watcher.close();
            exit('\nWatcher stopped');
        });
    } else {
        await createArchive(inputDir, outputFile, options.asFiles);
        return exit(`Successfully created ${outputFile} from ${inputDir}`);
    }
}