import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(new URL("../dist/", import.meta.url).pathname),
  port = Number(process.env.PORT || 4175);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};
const server = http
  .createServer(async (req, res) => {
    try {
      let url = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (url === "/meal-journal") {
        res.writeHead(302, { Location: "/meal-journal/" });
        res.end();
        return;
      }
      if (url.startsWith("/meal-journal/"))
        url = url.slice("/meal-journal".length);
      const file = path.resolve(
        root,
        `.${url.endsWith("/") ? `${url}index.html` : url}`,
      );
      if (!file.startsWith(`${root}/`) || !(await stat(file)).isFile()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Local preview: http://127.0.0.1:${server.address().port}/meal-journal/`,
    ),
  );
