import { h } from './upstreams-BUzrzV0G2.mjs';

async function c(s) {
  var _a;
  const e = h[s.params.entity];
  if (!e) return Response.json({ error: `unknown entity '${s.params.entity}'` }, { status: 404 });
  const a = `${e.base}${e.path}/reload-cache`;
  try {
    const t = await fetch(a, { method: "POST" }), n = await t.text();
    return new Response(n, { status: t.status, headers: { "content-type": (_a = t.headers.get("content-type")) != null ? _a : "application/json" } });
  } catch (t) {
    return Response.json({ error: `upstream unreachable: ${a}`, detail: String(t) }, { status: 502 });
  }
}

export { c as POST };
//# sourceMappingURL=reload-cache.mjs.map
