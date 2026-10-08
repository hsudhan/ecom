/**
 * Entity -> Rust upstream service map, shared by the BFF proxy routes
 * (src/routes/api/[entity].ts GET and src/routes/api/[entity]/reload-cache.ts
 * POST). Upstream bases are overridable via env for deployment flexibility.
 */
const ORDERS_API_URL = process.env.ORDERS_API_URL ?? "http://localhost:4001";
const SHIPMENTS_API_URL = process.env.SHIPMENTS_API_URL ?? "http://localhost:4002";
const USERS_API_URL = process.env.USERS_API_URL ?? "http://localhost:4003";
const LOGINS_API_URL = process.env.LOGINS_API_URL ?? "http://localhost:4004";
const SHOPPING_CARTS_API_URL = process.env.SHOPPING_CARTS_API_URL ?? "http://localhost:4005";
const PAYMENT_INFOS_API_URL = process.env.PAYMENT_INFOS_API_URL ?? "http://localhost:4006";
const PAYMENTS_API_URL = process.env.PAYMENTS_API_URL ?? "http://localhost:4007";
const SHIPMENT_TRACKINGS_API_URL = process.env.SHIPMENT_TRACKINGS_API_URL ?? "http://localhost:4008";

export const ENTITY_UPSTREAM: Record<string, { base: string; path: string }> = {
  orders: { base: ORDERS_API_URL, path: "/orders" },
  shipments: { base: SHIPMENTS_API_URL, path: "/shipments" },
  users: { base: USERS_API_URL, path: "/users" },
  logins: { base: LOGINS_API_URL, path: "/logins" },
  "shopping-carts": { base: SHOPPING_CARTS_API_URL, path: "/shopping-carts" },
  "payment-infos": { base: PAYMENT_INFOS_API_URL, path: "/payment-infos" },
  payments: { base: PAYMENTS_API_URL, path: "/payments" },
  "shipment-trackings": { base: SHIPMENT_TRACKINGS_API_URL, path: "/shipment-trackings" },
};
