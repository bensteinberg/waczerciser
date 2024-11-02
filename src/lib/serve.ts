import http from 'http';
import fs from 'fs';
import serveStatic from 'serve-static';
import finalhandler from 'finalhandler';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { startFileServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export async function startServer(warcPath: string, port = 8080) {
    const mainServer = await startFileServer({
        '/': {
            content: fs.readFileSync(path.join(__dirname, '../assets/index.html'), 'utf-8')
        }
    }, port);

    const embedServer = await startFileServer({
        '/': {
            path: path.join(__dirname, '../../contrib/wacz-exhibitor/html/embed/index.html')
        },
        '/index.js': {
            path: path.join(__dirname, '../../contrib/wacz-exhibitor/html/embed/index.js'),
            contentType: 'application/javascript',
        },
        '/replay-web-page/sw.js': {
            path: path.join(__dirname, '../../dist/serve/sw.js'),
            contentType: 'application/javascript',
        },
        '/replay-web-page/ui.js': {
            path: path.join(__dirname, '../../contrib/wacz-exhibitor/html/replay-web-page/ui.js'),
            contentType: 'application/javascript',
        },
        '/file.warc': {
            path: warcPath,
            contentType: 'application/warc-fields',
        }
    }, port + 1);

    return {
        close: () => Promise.all([
            mainServer.close(),
            embedServer.close()
        ]),
        mainServer,
        embedServer
    };
}