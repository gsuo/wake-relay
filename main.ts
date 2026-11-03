// Deno Deploy entrypoint: adapts the Cloudflare-style worker to Deno.serve.
import worker from "./worker.js";

(globalThis as unknown as Record<string, unknown>).GITHUB_PAT =
  Deno.env.get("GITHUB_PAT") ?? "";

Deno.serve((req: Request) => (worker as { fetch: (r: Request) => Promise<Response> }).fetch(req));
