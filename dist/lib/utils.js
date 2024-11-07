import fs from "fs";
import { getSurt } from "warcio/utils";
import path from "path";
import mime from "mime-types";
/**
 * Determine whether the given `path` points to a directory with files.
 *
 * @returns {Boolean}
 */
export async function hasFiles(path) {
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
export async function pathExists(path) {
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
export function uriToFilePath(record) {
    const uri = record.warcTargetURI;
    if (!uri) {
        throw new Error("URI is required");
    }
    let filename = getSurt(uri);
    // remove extra slashes
    filename = filename.replace(/\/+/g, "/");
    // make sure surt starts with the protocol (will be missing for http)
    const protocol = new URL(uri).protocol;
    if (!filename.startsWith(protocol)) {
        filename = `${protocol}/${filename}`;
    }
    // if no extension, use `__index__` as filename and content type to determine the extension
    if (filename.endsWith("/")) {
        const contentType = record.httpHeaders?.headers.get("Content-Type") || "text/html";
        const extension = mime.extension(contentType);
        filename += `__index__.${extension}`;
    }
    return filename;
}
/**
 * Join paths safely, protecting against directory traversal outside of the base path
 * @param base - Base path
 * @param paths - Paths to join
 * @returns Joined path
 */
export function safeJoin(base, ...paths) {
    return path.join(base || ".", path.join("/", ...paths));
}
