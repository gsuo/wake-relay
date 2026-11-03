// wake-relay: one-click wake for the GitHub Codespace behind Claude Code Web.
// Free Cloudflare Worker. The GitHub PAT lives only as an encrypted Worker secret.
const REPO = "gsuo/claude-relay";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}
const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), { status: code, headers: { ...cors(), "content-type": "application/json" } });

async function gh(method, path, body) {
  const r = await fetch("https://api.github.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + globalThis.GITHUB_PAT,
      Accept: "application/vnd.github+json",
      "User-Agent": "wake-relay",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
async function findCodespace() {
  const list = await gh("GET", "/user/codespaces");
  return ((list.data && list.data.codespaces) || []).find((c) => c.repository && c.repository.full_name === REPO) || null;
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    try {
      if (req.method === "POST" && (url.pathname === "/wake" || url.pathname === "/")) {
        const cs = await findCodespace();
        if (!cs) return json({ error: "codespace not found", state: "notfound" }, 404);
        if (cs.state === "Available") return json({ state: "Available", name: cs.name });
        if (cs.state === "Shutdown" || cs.state === "ShuttingDown") {
          await gh("POST", `/user/codespaces/${cs.name}/start`);
          return json({ state: "starting", name: cs.name });
        }
        return json({ state: cs.state, name: cs.name });
      }
      if (req.method === "GET" && url.pathname === "/status") {
        const cs = await findCodespace();
        if (!cs) return json({ state: "notfound" }, 404);
        return json({ state: cs.state, name: cs.name });
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e).slice(0, 200) }, 500);
    }
  },
};
