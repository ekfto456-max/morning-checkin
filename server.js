const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DIR = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

http.createServer((req, res) => {
  let url = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(DIR, url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
