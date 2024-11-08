#!/usr/bin/env node
import { Command, Option } from "commander";
import { extractCommand } from "./extract.js";
import { createCommand } from "./create.js";
import { serveCommand } from "./serve.js";
// Suppress only glob experimental warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
    if (warning.name !== 'ExperimentalWarning' || !warning.message.includes('glob')) {
        console.warn(warning);
    }
});
const program = new Command();
program.version("0.0.1").description("Read and write WACZ files as folders");
program
    .command("extract")
    .description("Extract a WACZ or WARC file to a directory")
    .argument("<inputFile>", "Path to the WACZ/WARC file to extract")
    .argument("[outputDir]", "Directory to extract the contents to (defaults to input filename without extension)")
    .option("--delete-existing", "Delete the entire output directory if it exists")
    .action(extractCommand);
program
    .command("create")
    .description("Create a WACZ or WARC file from a directory")
    .argument("<inputDir>", "Directory containing archive contents")
    .argument("<outputFile>", "Path where the archive file should be created")
    .option("-w, --watch", "Watch input directory and rebuild archive on changes")
    .option("--as-files", "Treat all files as file:// URLs instead of http(s):// URLs")
    .action(createCommand);
program
    .command("serve")
    .description("Serve a WACZ or WARC file via HTTP")
    .argument("<archiveFile>", "Path to the WACZ/WARC file or directory to serve")
    .option("-p, --port <number>", "Port to run the server on", "8080")
    .option("-u, --url <url>", "URL to start at", "")
    .option("-o, --output-file <outputFile>", "Store compiled archive to a file")
    .addOption(new Option("-f, --format <type>", "Force archive format for directories").choices(["wacz", "warc", "files"]))
    .action(serveCommand);
program.parse();
