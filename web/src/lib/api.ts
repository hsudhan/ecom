/**
 * API client + entity registry. Fetches are same-origin against the
 * SolidStart BFF proxy (src/routes/api/[entity].ts), which forwards each
 * entity to its Rust actix-web service on ports 4001-4008 (Redis-first with
 * PostgreSQL fallback on cache miss).
 * Tab order matches specs.md exactly.
 */
import { getRequestEvent, isServer } from "solid-js/web";

export const API_BASE = "/api"; // SolidStart BFF proxy -> Rust services (4001-4008)

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
  sortable?: boolean; // every column header toggles asc/desc sorting
}

export const ENTITIES: EntityConfig[] = [
  { id: "orders", label: "ORDERS", sortable: true },
  { id: "shipments", label: "SHIPMENT", sortable: true },
  { id: "users", label: "USERS" },
  { id: "logins", label: "LOGIN" },
  { id: "shopping-carts", label: "SHOPPING CART" },
  { id: "payment-infos", label: "PAYMENT INFO" },
  { id: "payments", label: "PAYMENT" },
  { id: "shipment-trackings", label: "SHIPMENT TRACKING" },
];

export type Row = Record<string, unknown>;
export type SortOrder = "asc" | "desc";

export interface PageResult {
  data: Row[];
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  sort: string;
  order: SortOrder;
}

/**
 * One page of an entity, sorted by any of its columns (sortable entities:
 * orders, shipments). Sorting happens inside the Rust service's Redis
 * indexes; the BFF proxy forwards sort/order untouched.
 */
export async function fetchPage(
  entity: string,
  page: number,
  sort: string = "id",
  order: SortOrder = "asc"
): Promise<PageResult> {
  const res = await fetch(
    `${apiBase()}/${entity}?page=${page}&page_size=${PAGE_SIZE}&sort=${encodeURIComponent(sort)}&order=${order}`
  );
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as PageResult;
}

export interface ReloadResult {
  reloaded: number;
  entity: string;
}

/**
 * RELOAD CACHE button action: POSTs to the BFF proxy, which forwards to the
 * entity's Rust service to re-fetch its full PostgreSQL table and overwrite
 * its Redis keys. Only the given entity's cache is reloaded.
 */
export async function reloadCache(entity: string): Promise<ReloadResult> {
  const res = await fetch(`${apiBase()}/${entity}/reload-cache`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as ReloadResult;
}
