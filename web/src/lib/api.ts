/**
 * API client + entity registry. Fetches are same-origin against the
 * SolidStart BFF proxy (src/routes/api/[entity].ts), which forwards:
 *   orders / shipments -> Rust actix-web APIs on 4001/4002 (Redis cache)
 *   the other entities -> legacy Fastify API on 4003 (PostgreSQL)
 * Tab order matches specs.md exactly.
 */
import { getRequestEvent, isServer } from "solid-js/web";

export const API_BASE = "/api"; // SolidStart BFF proxy -> Rust (4001/4002) / legacy (4003)

/**
 * Node's fetch rejects relative URLs, so during SSR the resource must call the
 * BFF proxy with an absolute origin derived from the incoming request.
 * In the browser the relative same-origin path is used as-is.
 */
function apiBase(): string {
  if (!isServer) return API_BASE;
  const event = getRequestEvent();
  const origin = event?.request?.url
    ? new URL(event.request.url).origin
    : `http://localhost:${process.env.PORT ?? 8081}`;
  return origin + API_BASE;
}
export const PAGE_SIZE = 50;

export interface EntityConfig {
  id: string; // endpoint path segment
  label: string; // tab label
}

export const ENTITIES: EntityConfig[] = [
  { id: "orders", label: "ORDERS" },
  { id: "shipments", label: "SHIPMENT" },
  { id: "users", label: "USERS" },
  { id: "logins", label: "LOGIN" },
  { id: "shopping-carts", label: "SHOPPING CART" },
  { id: "payment-infos", label: "PAYMENT INFO" },
  { id: "payments", label: "PAYMENT" },
  { id: "shipment-trackings", label: "SHIPMENT TRACKING" },
];

export type Row = Record<string, unknown>;

export interface PageResult {
  data: Row[];
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export async function fetchPage(entity: string, page: number): Promise<PageResult> {
  const res = await fetch(`${apiBase()}/${entity}?page=${page}&page_size=${PAGE_SIZE}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as PageResult;
}
