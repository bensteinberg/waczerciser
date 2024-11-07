import chalk from "chalk";
import { createArchive, watchAndCreate } from "../lib/create.js";
import { exit } from "./utils.js";
export async function createCommand(inputDir, outputFile, options) {
    if (options.watch) {
        console.log(chalk.blue(`Building initial archive from ${inputDir}...`));
        const watcher = await watchAndCreate(inputDir, outputFile, options.asFiles);
        process.on("SIGINT", async () => {
            await watcher.close();
            exit("\nWatcher stopped");
        });
    }
    else {
        await createArchive(inputDir, outputFile, options.asFiles);
        return exit(`Successfully created ${outputFile} from ${inputDir}`);
    }
}
