import { h } from './upstreams-BUzrzV0G2.mjs';

async function u(e) {
  var _a;
  const s = h[e.params.entity];
  if (!s) return Response.json({ error: `unknown entity '${e.params.entity}'` }, { status: 404 });
  const n = new URL(e.request.url), r = `${s.base}${s.path}${n.search}`;
  try {
    const t = await fetch(r), a = await t.text();
    return new Response(a, { status: t.status, headers: { "content-type": (_a = t.headers.get("content-type")) != null ? _a : "application/json" } });
  } catch (t) {
    return Response.json({ error: `upstream unreachable: ${r}`, detail: String(t) }, { status: 502 });
  }
}

export { u as GET };
//# sourceMappingURL=_entity_.mjs.map
