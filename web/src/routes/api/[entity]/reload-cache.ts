import type { APIEvent } from "@solidjs/start/server";
import { ENTITY_UPSTREAM } from "~/lib/upstreams";

/**
 * BFF proxy route for the RELOAD CACHE button: the browser POSTs same-origin
 * /api/{entity}/reload-cache and this handler forwards to the matching Rust
 * actix-web microservice's POST /{entity}/reload-cache, which re-fetches that
 * entity's full PostgreSQL table and overwrites its Redis keys. Only the
 * entity named in the URL is reloaded (shipments -> shipments:* only, etc.).
 */
export async function POST(event: APIEvent) {
  const upstream = ENTITY_UPSTREAM[event.params.entity];
  if (!upstream) {
    return Response.json(
      { error: `unknown entity '${event.params.entity}'` },
      { status: 404 }
    );
  }

  const target = `${upstream.base}${upstream.path}/reload-cache`;

  try {
    const res = await fetch(target, { method: "POST" });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return Response.json(
      { error: `upstream unreachable: ${target}`, detail: String(err) },
      { status: 502 }
    );
  }
}
