import chalk from "chalk";
import { createArchive, watchAndCreate } from "../lib/create.js";
import { exit } from "./utils.js";

interface CreateOptions {
	watch?: boolean;
	asFiles?: boolean;
}

export async function createCommand(
	inputDir: string,
	outputFile: string,
	options: CreateOptions,
) {
	try {
		if (options.watch) {
			console.log(chalk.blue(`Building initial archive from ${inputDir}...`));
			const watcher = await watchAndCreate(inputDir, outputFile, options.asFiles);
			process.on("SIGINT", async () => {
				await watcher.close();
				exit("\nWatcher stopped");
			});
		} else {
			await createArchive(inputDir, outputFile, options.asFiles);
			return exit(`Successfully created ${outputFile} from ${inputDir}`);
		}
	} catch (error) {
		if (error instanceof Error && 
			error.message.includes('Unexpected file in input directory')) {
			return exit(chalk.red(
				`Error: Input directory does not appear to be an unpacked WARC or WACZ file.\n` +
				`To create an archive from ordinary files, run the command again with the --as-files flag.`
			));
		}
		throw error;
	}
}
