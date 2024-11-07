import { glob } from "fs/promises";
import path from "path";
import {
	WARCSerializer,
	LimitReader,
	AsyncIterReader,
} from "warcio";
import fs from "fs";
import { uriToFilePath, safeJoin } from "./utils.js";

/**
 * Extract a WACZ or WARC file to a specified directory
 * @param inputFile - Path to the WACZ/WARC file to extract
 * @param outputDir - Directory where the contents should be extracted
 * @throws Error if extraction fails
 */
export async function extractArchive(
	inputFile: string,
	outputDir: string,
): Promise<void> {
	if (inputFile.toLowerCase().endsWith(".wacz")) {
		return await extractWACZ(inputFile, outputDir);
	} else if (
		inputFile.toLowerCase().endsWith(".warc") ||
		inputFile.toLowerCase().endsWith(".warc.gz")
	) {
		return await extractWARC(inputFile, outputDir);
	} else {
		throw new Error(
			"Unknown file type. Supported formats: .wacz, .warc, .warc.gz",
		);
	}
}

/**
 * Extract a WACZ file to a specified directory
 * @param waczFile - Path to the WACZ file to extract
 * @param outputDir - Directory where the contents should be extracted
 * @throws Error if extraction fails
 */
export async function extractWACZ(
	waczFile: string,
	outputDir: string,
): Promise<void> {
	// Validate inputs
	if (!waczFile.toLowerCase().endsWith(".wacz")) {
		throw new Error("Input file must have .wacz extension");
	}

	// Import required modules
	const yauzl = await import("yauzl-promise");
	const { pipeline } = await import("stream/promises");

	// Ensure output directory exists
	await fs.promises.mkdir(outputDir, { recursive: true });

	const zip = await yauzl.open(waczFile);
	try {
		for await (const entry of zip) {
			const entryPath = safeJoin(outputDir, entry.filename);
			if (entry.filename.endsWith("/")) {
				await fs.promises.mkdir(entryPath, { recursive: true });
			} else {
				await fs.promises.mkdir(path.dirname(entryPath), { recursive: true });
				await pipeline(
					await entry.openReadStream(),
					fs.createWriteStream(entryPath),
				);
			}
		}
	} finally {
		await zip.close();
	}

	// extract the warc files
	const warcFiles = await glob(`${outputDir}/archive/*.warc*`);
	for await (const warcFile of warcFiles) {
		const extractPath = warcFile.replace(".warc.gz", "");
		await extractWARC(warcFile, extractPath);
	}
}

/**
 * Extract a WARC file to a specified directory
 * @param warcFile - Path to the WARC file to extract
 * @param outputDir - Directory where the contents should be extracted
 * @throws Error if extraction fails
 */
export async function extractWARC(
	warcFile: string,
	outputDir: string,
): Promise<void> {
	// Import required modules
	const { WARCParser } = await import("warcio");
	const { Readable } = await import("stream");
	const { pipeline } = await import("stream/promises");

	// Ensure output directory exists
	await fs.promises.mkdir(outputDir, { recursive: true });

	// Create read stream for WARC file
	const nodeStream = fs.createReadStream(warcFile);
	const parser = new WARCParser(nodeStream);

	// Create write stream for the full WARC
	const fullWarcPath = path.join(
		outputDir,
		path.basename(warcFile).replace(/\.gz$/, ""),
	);
	const fullWarcStream = fs.createWriteStream(fullWarcPath);

	for await (const record of parser) {
		// dump responses as files
		if (record.warcType === "response" && record.warcTargetURI) {
			// Write the response content to its individual file
			const filename = uriToFilePath(record);
			const outputPath = safeJoin(outputDir, filename);
			await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
			await fs.promises.writeFile(outputPath, await record.contentText());

			// output the file name as fake file contents to the warc
			const buffer = Buffer.from(outputPath);
			const fakeReader = new AsyncIterReader(Readable.from(buffer));
			record._reader = new LimitReader(fakeReader, buffer.length);
			record._contentReader = null;
		}

		// TODO: this could potentially stream instead of buffering
		fullWarcStream.write(
			await WARCSerializer.serialize(record, { gzip: false }),
		);
	}

	await fullWarcStream.end();
}
