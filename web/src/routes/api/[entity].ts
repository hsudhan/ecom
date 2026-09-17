import type { APIEvent } from "@solidjs/start/server";

/**
 * BFF proxy route (claude.md tier 2): the browser fetches same-origin
 * /api/{entity}?page=N&page_size=M and this server-side handler forwards the
 * request to the correct upstream service:
 *
 *   orders              -> Rust orders_api     (localhost:4001, Redis cache)
 *   shipments           -> Rust shipments_api  (localhost:4002, Redis cache)
 *   other 6 entities    -> legacy Fastify API  (localhost:4003, PostgreSQL)
 *
 * The Rust actix-web services carry no CORS middleware, so server-side
 * proxying keeps the browser same-origin and leaves the Rust tier untouched.
 * Upstream bases are overridable via env for deployment flexibility.
 */
const ORDERS_API_URL = process.env.ORDERS_API_URL ?? "http://localhost:4001";
const SHIPMENTS_API_URL = process.env.SHIPMENTS_API_URL ?? "http://localhost:4002";
const LEGACY_API_URL = process.env.LEGACY_API_URL ?? "http://localhost:4003";

const ENTITY_UPSTREAM: Record<string, { base: string; path: string }> = {
  orders: { base: ORDERS_API_URL, path: "/orders" },
  shipments: { base: SHIPMENTS_API_URL, path: "/shipments" },
  users: { base: LEGACY_API_URL, path: "/users" },
  logins: { base: LEGACY_API_URL, path: "/logins" },
  "shopping-carts": { base: LEGACY_API_URL, path: "/shopping-carts" },
  "payment-infos": { base: LEGACY_API_URL, path: "/payment-infos" },
  payments: { base: LEGACY_API_URL, path: "/payments" },
  "shipment-trackings": { base: LEGACY_API_URL, path: "/shipment-trackings" },
};

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
