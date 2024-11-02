import http from 'http';
import fs from 'fs';
import path from 'path';

type ContentConfig = {
    path?: string;
    content?: string;
    contentType?: string;
    stats?: fs.Stats;
}

type ServerConfig = {
    [url: string]: ContentConfig;
}

export function startFileServer(config: ServerConfig, port = 8080): http.Server {
    // check config
    for (const [url, entry] of Object.entries(config)) {
        if (!entry.content && !entry.path) {
            throw new Error(`Invalid config for URL '${url}': must specify either 'content' or 'path'`);
        }
        if (entry.path) {
            if (!fs.existsSync(entry.path)) {
                throw new Error(`File not found for URL '${url}': ${entry.path}`);
            }
            entry.stats = fs.statSync(entry.path);
        }
    }

    const server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const urlPath = url.pathname;
        const configEntry = config[urlPath];
        
        // handle 404
        if (!configEntry) {
            console.log(`[${new Date().toISOString()}] 404 Not Found: ${urlPath}`);
            res.writeHead(404, 'Not Found');
            res.end();
            return;
        }
        
        // set headers
        res.setHeader('Content-Type', configEntry.contentType || 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // handle range requests
        let start = 0;
        const size = configEntry.stats ? configEntry.stats.size : configEntry.content.length;
        let end = size - 1;
        if (req.headers.range) {
            const range = req.headers.range;
            const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
            start = parseInt(startStr, 10);
            end = endStr ? parseInt(endStr, 10) : end;
            
            if (start >= size || end >= size) {
                res.setHeader('Content-Range', `bytes */${size}`);
                res.writeHead(416, 'Requested Range Not Satisfiable');
                res.end();
                return;
            }

            res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.writeHead(206, 'Partial Content');
            console.log(`[${new Date().toISOString()}] 206 Partial Content: ${urlPath} (${start}-${end}/${size})`);
        } else {
            res.writeHead(200, {'Content-Length': size});
            console.log(`[${new Date().toISOString()}] 200 OK: ${urlPath}`);
        }

        // return content
        if (configEntry.path) {
            const readStream = fs.createReadStream(configEntry.path, { start, end });
            readStream.pipe(res);
        } else {
            res.end(configEntry.content.substring(start, end + 1));
        }
    });

    return server.listen(port);
}