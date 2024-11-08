import fs from "fs";
import path from "path";
import mime from "mime-types";
import type { WARCRecord } from "warcio";

/**
 * Determine whether the given `path` points to a directory with files.
 *
 * @returns {Boolean}
 */
export async function hasFiles(path: string) {
	const directory = await fs.promises.opendir(path);
	const entry = await directory.read();
	await directory.close();
	return entry !== null;
}

/**
 * Determine whether the given `path` exists.
 *
 * @returns {Boolean}
 */
export async function pathExists(path: string) {
	return await fs.promises
		.access(path)
		.then(() => true)
		.catch(() => false);
}

/**
 * Convert a URI to a file path, include protocol: as the first directory, and adding __index__.html if it's a directory
 * @param uri - URI to convert
 * @returns File path
 */
export function uriToFilePath(record: WARCRecord) {
    let uri = record.warcTargetURI;
    if (!uri) {
		throw new Error("WARC-Target-URI header is required");
	}

	// make sure surt starts with the protocol (will be missing for http)
	// const protocol = new URL(uri).protocol;
	// if (!filename.startsWith(protocol)) {
	// 	filename = `${protocol}/${filename}`;
	// }
	uri = uri.replace(/\/+/g, "/");


	// if no extension, use `__index__` as filename and content type to determine the extension
	if (uri.endsWith("/")) {
        const contentType = record.httpHeaders?.headers.get("Content-Type") || "text/html";
        const extension = mime.extension(contentType);
		uri += `__index__.${extension}`;
	}
	return uri;
}

/**
 * Join paths safely, protecting against directory traversal outside of the base path
 * @param base - Base path
 * @param paths - Paths to join
 * @returns Joined path
 */
export function safeJoin(base: string, ...paths: string[]): string {
	return path.join(base || ".", path.join("/", ...paths));
}
