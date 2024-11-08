import chalk from "chalk";
import fs from "fs";
import { hasFiles } from "../lib/utils.js";
import { extractArchive } from "../lib/extract.js";
import { exit } from "./utils.js";

export async function extractCommand(
	inputFile: string,
	outputDir?: string,
	options: { deleteExisting?: boolean } = {},
) {
	// Default outputDir to inputFile without extension
	if (!outputDir) {
		outputDir = inputFile.replace(/\.[^/.]+$/, "");
	}

	// Check if directory exists and has files
	if (fs.existsSync(outputDir)) {
		if (fs.lstatSync(outputDir).isFile()) {
			return exit("Output path is a file rather than a directory.", 1);
		}

		if (await hasFiles(outputDir)) {
			if (options.deleteExisting) {
				fs.rmSync(outputDir, { recursive: true, force: true });
			} else {
				return exit(
					`Output directory "${outputDir}" is not empty. Use --delete-existing flag to delete the entire directory and its contents before extraction.`,
					1,
				);
			}
		}
	}

	await extractArchive(inputFile, outputDir);

	return exit(`Successfully extracted ${inputFile} to ${outputDir}`);
}
