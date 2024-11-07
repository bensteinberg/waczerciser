import { glob } from "fs/promises";
import path from "path";
import { WARCRecord, LimitReader, AsyncIterReader } from "warcio";
import fs from "fs";
import { pathExists, uriToFilePath } from "./utils.js";
import type { FSWatcher } from "chokidar";
import mime from "mime-types";

/**
 * Create a WACZ or WARC file from a directory
 * @param inputDir - Directory containing the WACZ or WARC contents
 * @param archiveFile - Path where the WACZ or WARC file should be created
 * @param asFiles - Whether to include files in the WARC
 * @throws Error if creation fails
 */
export async function createArchive(
	inputDir: string,
	archiveFile: string,
	asFiles: boolean = false,
): Promise<void> {
	if (archiveFile.toLowerCase().endsWith(".wacz")) {
		return await createWACZ(inputDir, archiveFile, asFiles);
	} else if (
		archiveFile.toLowerCase().endsWith(".warc") ||
		archiveFile.toLowerCase().endsWith(".warc.gz")
	) {
		return await createWARC(inputDir, archiveFile, asFiles);
	} else {
		throw new Error("Invalid archive file extension");
	}
}

/**
 * Create a WACZ file from a directory
 * @param inputDir - Directory containing the WACZ contents
 * @param waczFile - Path where the WACZ file should be created
 * @param asFiles - Whether to include files in the WARC
 * @throws Error if creation fails
 */
export async function createWACZ(
	inputDir: string,
	waczFile: string,
	asFiles: boolean = false,
): Promise<void> {
	// Import required modules
	const { WACZ } = await import("@harvard-lil/js-wacz");
	const os = await import("os");

	// Create temporary directory
	const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wacz-"));

	try {
		const archiveDir = `${inputDir}/archive`;
		const createdWarcs: string[] = [];

		// Create a WARC file for each directory
		for await (const dir of glob(`${archiveDir}/*`, { withFileTypes: true })) {
			if (!dir.isDirectory()) continue;
			const warcFile = path.join(tempDir, `${dir.name}.warc.gz`);
			await createWARC(path.join(archiveDir, dir.name), warcFile, asFiles);
			createdWarcs.push(warcFile);
		}

		// add any .warc/.warc.gz files in the input directory that aren't already in the temp directory
		for await (const warcFile of glob(`${archiveDir}/*.warc.gz`)) {
			const outputFile = path.join(tempDir, path.basename(warcFile));
			if (!createdWarcs.includes(outputFile)) {
				// copy the file to the temp directory
				await fs.promises.copyFile(warcFile, outputFile);
				createdWarcs.push(outputFile);
			}
		}

		// if there are no warcs, throw an error
		if (createdWarcs.length === 0) {
			throw new Error(`No WARC files or directories found in ${archiveDir}`);
		}

		// Create new WACZ instance with configuration
		const config: any = {
			input: `${tempDir}/*.warc.gz`,
			output: waczFile,
		};

		// include optional directories if they exist
		if (await pathExists(`${inputDir}/pages`)) {
			config.pagesDir = `${inputDir}/pages`;
		}
		if (await pathExists(`${inputDir}/logs`)) {
			config.logDir = `${inputDir}/logs`;
		}

		// Process and create the WACZ file
		await new WACZ(config).process();
	} finally {
		// Clean up temporary directory and its contents
		try {
			await fs.promises.rm(tempDir, { recursive: true });
		} catch (e) {
			console.warn(`Failed to delete temporary directory ${tempDir}:`, e);
		}
	}
}

/**
 * Create a WARC file from a directory of extracted contents
 * @param inputDir - Directory containing the extracted WARC contents
 * @param outputFile - Path where the WARC file should be created
 * @param asFiles - Whether to include files in the WARC
 * @throws Error if creation fails
 */
export async function createWARC(
	inputDir: string,
	outputFile: string,
	asFiles: boolean,
): Promise<void> {
	console.log("creating warc", inputDir, outputFile);
	const { WARCSerializer } = await import("warcio");

	// get map of all files
	const files = await glob(`${inputDir}/**/*`);
	const pathMap: Record<string, fs.Stats> = {};
	let warcPath = null;
	for await (const filePath of files) {
		const stats = await fs.promises.stat(filePath);
		if (!stats.isFile()) continue;

		const relativePath = path.relative(inputDir, filePath);

		// if we are exporting a directory as files, include all files
		if (asFiles) {
			pathMap[relativePath] = stats;
			continue;
		}

		// otherwise, we're processing an exported warc, so directory should only include warcs and http/file urls
		if (relativePath.endsWith(".warc") && !relativePath.includes("/")) {
			if (warcPath) {
				throw new Error("Multiple WARC files found in input directory");
			}
			warcPath = filePath;
		} else if (
			["https:", "http:", "file:"].includes(relativePath.split("/")[0])
		) {
			pathMap[relativePath] = stats;
		} else {
			throw new Error(`Unexpected file in input directory: ${relativePath}`);
		}
	}

	const useGzip = outputFile.endsWith(".gz");
	const warcStream = fs.createWriteStream(outputFile);

	// if warc exists, start by exporting it, injecting data from files
	if (warcPath) {
		const { WARCParser } = await import("warcio");
		const { Readable } = await import("stream");

		const nodeStream = fs.createReadStream(warcPath);
		const parser = new WARCParser(nodeStream);

		for await (const record of parser) {
			if (record.warcType === "response" && record.warcTargetURI) {
				const filename = uriToFilePath(record);
				// If we have a matching file, inject its contents
				if (filename in pathMap) {
                    const filePath = path.join(inputDir, filename);
					let fileContent = await fs.promises.readFile(filePath);
                    
					// handle http headers
                    const headers = record.httpHeaders?.headers;
                    if (headers) {
                        if (
                            headers
                                .get("Content-Encoding")
                                ?.toLowerCase() === "gzip"
                        ) {
                            const zlib = await import("zlib");
                            fileContent = await zlib.gzipSync(fileContent);
                        }
                        headers.set(
							"Content-Length",
							fileContent.length.toString(),
						);
					}

					const buffer = Buffer.from(fileContent);
					const fakeReader = new AsyncIterReader(Readable.from(buffer));
					record._reader = new LimitReader(
						fakeReader,
						fileContent.length,
					);
					delete pathMap[filename];
				}
			}
			warcStream.write(
				await WARCSerializer.serialize(record, { gzip: useGzip }),
			);
		}
	}

	// Iterate over sorted paths
	for (const relativePath of Object.keys(pathMap).sort()) {
		const stats = pathMap[relativePath];
		const filePath = path.join(inputDir, relativePath);

		// calculate a URL from the relative path
		const parts = relativePath.split(path.sep);

		let protocol;
		if (asFiles) {
			protocol = "file:";
			parts.unshift("file://");
		} else {
			protocol = parts[0];

            // skip warc file created during extraction
			if (protocol.endsWith(".warc")) {
				continue;
			}

			// add slashes to http and file protocols
			if (["https:", "http:"].includes(protocol)) {
                // http protocol
				parts[0] += "/";
			} else {  
                // file protocol
				parts[0] += "//";
			}
		}

		// strip last part if it's an index file
		if (parts[parts.length - 1] === "__index__.html") {
			parts[parts.length - 1] = "";
		}

		const url = parts.join("/");

		// Create a response record with streaming content
		const fileStream = fs.createReadStream(filePath);
		const contentType = mime.lookup(filePath) || 'text/html';
		const httpHeaders: Record<string, string> = { "Content-Type": contentType };
		if (protocol.startsWith("http")) {
			httpHeaders["Content-Length"] = stats.size.toString();
		}
		const record = await WARCRecord.create(
			{
				type: "response",
				url,
				httpHeaders,
			},
			fileStream,
		);

		// Write the record to the WARC file
		// TODO: this could potentially stream instead of buffering
		warcStream.write(await WARCSerializer.serialize(record, { gzip: useGzip }));
	}

	await warcStream.end();
}

/**
 * Watch a directory and rebuild the archive when changes are detected
 * @param inputDir - Directory to watch for changes
 * @param archiveFile - Path where the archive file should be created
 * @returns Chokidar watcher instance
 */
export async function watchAndCreate(
	inputDir: string,
	archiveFile: string,
	asFiles: boolean = false,
): Promise<FSWatcher> {
	const chokidar = await import("chokidar");

	// Build initial archive
	await createArchive(inputDir, archiveFile, asFiles);

	// Set up file watcher
	const watcher = chokidar.watch(inputDir, {
		ignored: /(^|[\/\\])\../, // ignore dotfiles. TODO: should we?
		persistent: true,
	});

	// Watch for changes and rebuild the archive
	watcher.on("change", async (path) => {
		console.log(`Changes detected in ${path}, rebuilding archive...`);
		await createArchive(inputDir, archiveFile, asFiles);
		console.log("Archive rebuilt successfully");
	});

	return watcher;
}
