import http from "http";
import path from "path";
import finalhandler from "finalhandler";
import send from "send";
export async function startServer(warcPath, url = "", port = 8080) {
    const warcUrl = `/${path.basename(warcPath)}`;
    const indexHtml = `<!doctype html>
    <html lang="en">
      <head>
        <title>wacz-exhibitor sandbox</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow"/>
        <style type="text/css">
        * {
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        html {
          font-family: monospace;
          font-size: 18px;
        }
        body {
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          padding: 1rem;
        }
        .replay-frame {
          display: block;
          width: 90%;
          max-width: 90%;
          flex: 1;
          margin: auto;
          border: 0.25rem solid black;
          border-radius: 0.5rem;
        }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/replaywebpage@2.2.1/ui.js"></script>
      </head>
      
      <body id="item">
        <h1>warc replay sandbox</h1>
        <replay-web-page source="${warcUrl}" url="${url}" class="replay-frame" noCache></replay-web-page>
      </body>
    </html>`;
    const server = http.createServer((req, res) => {
        // Serve static string at root path
        if (req.url === "/") {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(indexHtml);
            return;
        }
        // Serve service worker script at /replay/sw.js (with any query params)
        if (req.url?.startsWith("/replay/sw.js")) {
            res.writeHead(200, { "Content-Type": "application/javascript" });
            res.end('importScripts("https://cdn.jsdelivr.net/npm/replaywebpage@2.2.1/sw.js");');
            return;
        }
        // Serve WARC file at /basename
        if (req.url === warcUrl) {
            send(req, warcPath)
                .on("error", (err) => {
                res.statusCode = err.status || 500;
                finalhandler(req, res)(err);
            })
                .pipe(res);
            return;
        }
        // Handle 404 for other routes
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    });
    return server.listen(port);
}
