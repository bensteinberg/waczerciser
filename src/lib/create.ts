import { glob } from 'fs/promises';
import path from 'path';
import { WARCRecord, LimitReader } from 'warcio';
import fs from 'fs';
import { uriToFilePath } from './utils.js';


/**
 * Create a WACZ or WARC file from a directory
 * @param inputDir - Directory containing the WACZ or WARC contents
 * @param archiveFile - Path where the WACZ or WARC file should be created
 * @throws Error if creation fails
 */
export async function createArchive(inputDir: string, archiveFile: string): Promise<void> {
    if (archiveFile.toLowerCase().endsWith('.wacz')) {
        return createWACZ(inputDir, archiveFile);
    } else if (archiveFile.toLowerCase().endsWith('.warc') || archiveFile.toLowerCase().endsWith('.warc.gz')) {
        return createWARC(inputDir, archiveFile);
    } else {
        throw new Error('Invalid archive file extension');
    }
}

/**
 * Create a WACZ file from a directory
 * @param inputDir - Directory containing the WACZ contents
 * @param waczFile - Path where the WACZ file should be created
 * @throws Error if creation fails
 */
export async function createWACZ(inputDir: string, waczFile: string): Promise<void> {
    // Import required modules
    const { WACZ } = await import('@harvard-lil/js-wacz');
    
    // Create new WACZ instance with configuration
    const archive = new WACZ({
        // Point to WARC files in the archive directory
        input: `${inputDir}/archive/*.warc*`,
        // Set output path
        output: waczFile,
        // Use existing pages files if present
        pagesDir: `${inputDir}/pages`,
        // Use existing CDXJ files if present 
        cdxjDir: `${inputDir}/indexes`,
        // Include logs if present
        logDir: `${inputDir}/logs`
    });

    // Process and create the WACZ file
    await archive.process();
}

/**
 * Create a WARC file from a directory of extracted contents
 * @param inputDir - Directory containing the extracted WARC contents
 * @param outputFile - Path where the WARC file should be created
 * @throws Error if creation fails
 */
export async function createWARC(inputDir: string, outputFile: string): Promise<void> {
    const { WARCSerializer } = await import('warcio');

    const useGzip = outputFile.endsWith('.gz');
    const warcStream = fs.createWriteStream(outputFile);

    // get map of all files
    const files = await glob(`${inputDir}/**/*`);
    const pathMap: Record<string, fs.Stats> = {};
    let warcPath = null;
    for await (const filePath of files) {
        const stats = await fs.promises.stat(filePath);
        if (!stats.isFile()) continue;
        
        const relativePath = path.relative(inputDir, filePath);
        if (relativePath.endsWith('.warc') && !relativePath.includes('/')) {
            if (warcPath) {
                throw new Error('Multiple WARC files found in input directory');
            }
            warcPath = filePath;
        } else if (['https:', 'http:', 'file:'].includes(relativePath.split('/')[0])) {
            pathMap[relativePath] = stats;
        } else {
            throw new Error(`Unexpected file in input directory: ${relativePath}`);
        }
    }

    // if warc exists, start by exporting it, injecting data from files
    if (warcPath) {
        const { WARCParser } = await import('warcio');
        const { Readable } = await import('stream');
        
        const nodeStream = fs.createReadStream(warcPath);
        const parser = new WARCParser(nodeStream);

        for await (const record of parser) {
            if (record.warcType === 'response' && record.warcTargetURI) {
                const filename = uriToFilePath(record.warcTargetURI);
                // If we have a matching file, inject its contents
                if (filename in pathMap) {
                    const filePath = path.join(inputDir, filename);
                    let fileContent = await fs.promises.readFile(filePath);
                    
                    // handle http headers
                    if (record.httpHeaders?.headers.get('Content-Encoding')?.toLowerCase() === 'gzip') {
                        console.log("HAS GZIP")
                        const zlib = await import('zlib');
                        fileContent = await zlib.gzipSync(fileContent);
                    }
                    record.httpHeaders.headers.set('Content-Length', fileContent.length.toString());
                    
                    record._reader = new LimitReader(Readable.from(fileContent), fileContent.length);
                    delete pathMap[filename];
                }
            }
            warcStream.write(await WARCSerializer.serialize(record, { gzip: useGzip }));
        }
    }

    // Iterate over sorted paths
    for (const relativePath of Object.keys(pathMap).sort()) {
        const stats = pathMap[relativePath];
        const filePath = path.join(inputDir, relativePath);

        // calculate a URL from the relative path
        const parts = relativePath.split(path.sep);
        const protocol = parts[0];
        if (protocol.endsWith('.warc')) {
            continue;
        }

        // http protocol
        if (['https:', 'http:'].includes(protocol)) {
            parts[0] += '/';
            
            // Remove trailing parenthesis if present
            parts[1] = parts[1].replace(/\)$/, '');
            
            // Reverse SURT domain components (e.g., "com,example" -> "example.com")
            parts[1] = parts[1].split(',').reverse().join('.');
        }

        // file protocol
        else if (protocol === 'file:') {
            parts[0] += '//';
        }

        // strip last part if it's an index file
        if (parts[parts.length - 1] === '__index__.html') {
            parts[parts.length - 1] = '';
        }

        let url = parts.join('/');
        
        // Create a response record with streaming content
        const fileStream = fs.createReadStream(filePath);
        const httpHeaders = {'Content-Type': 'text/html'}  // TODO: detect proper content type
        if (protocol.startsWith('http')) {
            httpHeaders['Content-Length'] = stats.size.toString();
        }
        const record = await WARCRecord.create({
            type: 'response',
            url,
            httpHeaders
        }, fileStream);

        // Write the record to the WARC file
        // TODO: this could potentially stream instead of buffering
        warcStream.write(await WARCSerializer.serialize(record, { gzip: useGzip }));
    }

    await warcStream.end();
}