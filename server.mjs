// Node adapter for hosts without a fetch-handler runtime (e.g. Render).
// The shared worker logic lives in worker.js; GITHUB_PAT comes from env.
import http from "node:http";

globalThis.GITHUB_PAT = process.env.GITHUB_PAT || "";
const worker = (await import("./worker.js")).default;

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length && req.method !== "GET" && req.method !== "HEAD"
      ? Buffer.concat(chunks) : undefined;
    const url = new URL(req.url || "/", "http://localhost");
    const request = new Request(url, { method: req.method, headers: req.headers, body });
    const response = await worker.fetch(request);
    const headers = {};
    response.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String((e && e.message) || e).slice(0, 200) }));
  }
});

const port = Number(process.env.PORT) || 10000;
server.listen(port, () => console.log("wake-relay listening on :" + port));
