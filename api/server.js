/**
 * ecom-api — Fastify API gateway tier (claude.md tier 3).
 *
 * - Serves paginated reads from the `ecommerce` PostgreSQL schema.
 * - Every route validates query params with Ajv JSON schemas (claude.md rule #3).
 * - Structured logging via pino (Fastify built-in).
 * - Table/column identifiers come from a server-side allow-list — client input
 *   is never interpolated into SQL identifiers.
 *
 * Endpoint pattern (specs.md):
 *   GET http://localhost:4001/orders?page=1&page_size=50
 *   -> { data, page, page_size, total_records, total_pages }
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import pg from "pg";

const { Pool } = pg;

const CONN_STRING =
  process.env.DATABASE_URL ?? "postgresql://harir@localhost:5432/ecomdb";
const PORT = Number(process.env.API_PORT ?? 4001);

const pool = new Pool({ connectionString: CONN_STRING });

const app = Fastify({
  logger: { level: "info" }, // pino structured format
});

await app.register(cors, { origin: true });

// ---------------------------------------------------------------------------
// Entity allow-list: route -> table + exposed columns.
// NOTE: users.password is intentionally excluded from the API surface.
// ---------------------------------------------------------------------------
const ENTITIES = {
  orders: {
    table: 'ecommerce."order"',
    columns: ["id", "customer_id", "order_date", "status", "total_amount", "created_at", "updated_at"],
  },
  shipments: {
    table: "ecommerce.shipment",
    columns: ["id", "order_id", "shipment_date", "shipment_status", "shipment_cost", "created_at", "updated_at"],
  },
  users: {
    table: 'ecommerce."user"',
    columns: ["id", "username", "email", "created_at", "updated_at"],
  },
  logins: {
    table: "ecommerce.login",
    columns: ["id", "user_id", "login_date", "ip_address", "login_type", "device_name", "location"],
  },
  "shopping-carts": {
    table: "ecommerce.shopping_cart",
    columns: ["id", "order_id", "customer_id", "product_id", "quantity", "created_at", "updated_at"],
  },
  "payment-infos": {
    table: "ecommerce.payment_info",
    columns: ["id", "order_id", "payment_method", "payment_amount", "payment_status", "payment_date", "created_at", "updated_at"],
  },
  payments: {
    table: "ecommerce.payment",
    columns: ["id", "order_id", "payment_date", "payment_amount", "payment_status", "created_at", "updated_at"],
  },
  "shipment-trackings": {
    table: "ecommerce.shipment_tracking",
    columns: ["id", "shipment_id", "tracking_number", "status", "updated_at"],
  },
};

// Ajv JSON schema shared by every paginated route.
// Fastify coerces querystring strings -> integers per this schema.
const paginationSchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      page_size: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
};

app.get("/health", async () => ({ status: "ok" }));

for (const [route, { table, columns }] of Object.entries(ENTITIES)) {
  app.get(`/${route}`, { schema: paginationSchema }, async (request) => {
    const { page, page_size } = request.query;
    const offset = (page - 1) * page_size;
    const colList = columns.join(", ");

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT ${colList} FROM ${table} ORDER BY id LIMIT $1 OFFSET $2`,
        [page_size, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM ${table}`),
    ]);

    const total = countResult.rows[0].total;
    return {
      data: dataResult.rows,
      page,
      page_size,
      total_records: total,
      total_pages: Math.max(1, Math.ceil(total / page_size)),
    };
  });
}

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
