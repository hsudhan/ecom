import type { APIEvent } from "@solidjs/start/server";
import { ENTITY_UPSTREAM } from "~/lib/upstreams";

/**
 * BFF proxy route (claude.md tier 2): the browser fetches same-origin
 * /api/{entity}?page=N&page_size=M and this server-side handler forwards the
 * request to the matching Rust actix-web microservice. Every tab is served
 * Redis-first with PostgreSQL fallback inside the Rust tier (cache-aside):
 *
 *   orders             -> orders_api             (localhost:4001)
 *   shipments          -> shipments_api          (localhost:4002)
 *   users              -> users_api              (localhost:4003)
 *   logins             -> logins_api             (localhost:4004)
 *   shopping-carts     -> shopping_carts_api     (localhost:4005)
 *   payment-infos      -> payment_infos_api      (localhost:4006)
 *   payments           -> payments_api           (localhost:4007)
 *   shipment-trackings -> shipment_trackings_api (localhost:4008)
 *
 * The legacy Fastify API (PostgreSQL, default port 4010) remains available
 * as a manual fallback but is no longer wired into the proxy.
 *
 * The Rust actix-web services carry no CORS middleware, so server-side
 * proxying keeps the browser same-origin and leaves the Rust tier untouched.
 * The upstream map lives in src/lib/upstreams.ts (shared with the
 * reload-cache proxy route).
 */

export async function GET(event: APIEvent) {
  const upstream = ENTITY_UPSTREAM[event.params.entity];
  if (!upstream) {
    return Response.json(
      { error: `unknown entity '${event.params.entity}'` },
      { status: 404 }
    );
  }

  // Forward the client query string (page / page_size) untouched.
  const url = new URL(event.request.url);
  const target = `${upstream.base}${upstream.path}${url.search}`;

  try {
    const res = await fetch(target);
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
