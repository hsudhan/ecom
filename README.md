# Ecommerce Admin

A multi-tier ecommerce admin app. A SolidJS/SolidStart web UI browses 8
paginated entity views (orders, shipments, users, logins, shopping carts,
payment infos, payments, shipment trackings) backed by 100K orders and 100K
shipments. Reads for orders and shipments come from a Redis cache through two
small Rust services; the other six entities come straight from PostgreSQL
through a legacy Fastify API. The browser only ever talks to the SolidStart
server, which proxies each request to the right upstream.

The runtime spans two sibling repositories:

| Repo | Path | Contents |
| --- | --- | --- |
| [ecom](https://github.com/hsudhan/ecom) | this repo | SolidStart web app (`web/`), legacy Fastify API (`api/`), schema (`DDL.sql`), seed loader (`load_data.py`) |
| [ecomrust](https://github.com/hsudhan/ecomrust) | `../ecomrust` | Rust REST APIs, gRPC services, Redis cache loader, Node gRPC gateway |

Clone them side by side so `../ecomrust` resolves from this repo's root.

## Architecture

```
[ Browser (SolidJS) ]
        │  ▲
   HTTP │  │ HTML / JSON (same-origin /api/{entity})
        ▼  │
[ SolidStart BFF  :8081 ]  web/  (this repo)
        │
        ├─ orders, shipments ──────────────┐
        │                                  ▼
        │                    [ Rust actix-web APIs ]
        │                    orders_api    :4001 ─┐
        │                    shipments_api :4002 ─┤ reads
        │                                         ▼
        │                                   [ Redis :6379 ]
        │                                   (cache, loaded
        │                                   from Postgres)
        │
        └─ users, logins, shopping-carts,
           payment-infos, payments,  [ legacy Fastify API :4003 ]  api/  (this repo)
           shipment-trackings               │
                                            ▼
                                     [ PostgreSQL :5432 ]
                                     ecomdb, schema `ecommerce`
                                     (primary storage, 15 tables)
```

Why the proxy exists: the Rust services carry no CORS middleware, so the
SolidStart server forwards `/api/{entity}` server-side and the browser stays
same-origin. Upstream bases are env-overridable (`ORDERS_API_URL`,
`SHIPMENTS_API_URL`, `LEGACY_API_URL`).

There is also a parallel gRPC path in `../ecomrust`, built from the shared
contract `proto/ecom.proto`: a tonic server on `:50051`
(`cargo run --bin grpc_server`) and a Fastify gateway on `:4000`
(`gateway/server.js`) that calls Rust over gRPC for orders/shipments and hits
Postgres directly for the other six entities. The web UI does not use this
path today; it exists per `../ecomrust/specs.md` (#3, #7).

## Repository layout

```
ecom/                     ← this repo
├── web/                  SolidStart app (BFF tier), port 8081
│   └── src/
│       ├── routes/index.tsx          tab bar + panel host (specs.md)
│       ├── routes/api/[entity].ts    BFF proxy: entity -> upstream map
│       ├── components/EntityPanel.tsx data grid + pagination
│       └── lib/api.ts                fetch client + entity registry
├── api/server.js         legacy Fastify API, port 4003 (Postgres reads)
├── DDL.sql               15-table `ecommerce` schema for ecomdb
├── load_data.py          seeded random data loader (100K orders/shipments)
├── specs.md              UI + pagination spec
└── claude.md             architecture + coding rules

../ecomrust/              ← sibling repo
├── src/bin/orders_api.rs      REST :4001 (Redis)
├── src/bin/shipments_api.rs   REST :4002 (Redis)
├── src/bin/cache_loader.rs    Postgres -> Redis loader
├── src/bin/grpc_server.rs     tonic gRPC :50051
├── src/bin/grpc_client.rs     gRPC smoke test
├── src/cache.rs               Redis key layout + list/get logic
├── src/db.rs                  sqlx Postgres access (loader only)
├── proto/ecom.proto           shared gRPC contract
└── gateway/server.js          Fastify gRPC gateway :4000
```

## Prerequisites

- Node.js >= 18 and npm
- Rust toolchain (cargo)
- PostgreSQL running on `localhost:5432` with a login that owns `ecomdb`
  (the default connection string is `postgresql://harir@localhost:5432/ecomdb`)
- Redis running on `localhost:6379`
- Python 3 with `psycopg2` (for the seed loader)

## Quick start

Run each service in its own terminal. Order matters: the database and cache
must be populated before the APIs return data. `cd` commands below are given
from the workspace root (the directory containing both the `ecom/` and
`ecomrust/` clones).

### 1. Create and seed the database

```bash
cd ecom
createdb ecomdb
psql -d ecomdb -f DDL.sql
python3 load_data.py
```

`load_data.py` inserts parents before children, preserving referential
integrity (shipments 1:1 with orders, payment amounts equal order totals, and
so on). It is seeded (`Random(42)`), so every run produces identical data.

### 2. Load the Redis cache

```bash
cd ecomrust
cargo run --bin cache_loader
```

Expected output ends with `loaded 100000 orders into Redis (orders:*)`,
`loaded 100000 shipments into Redis (shipments:*)`, `done`. The Rust APIs
serve only from Redis, so skipping this step leaves them returning empty
pages.

### 3. Start the Rust APIs

```bash
cd ecomrust
cargo run --bin orders_api      # terminal A, listens on :4001
cargo run --bin shipments_api   # terminal B, listens on :4002
```

### 4. Start the legacy Fastify API

```bash
cd ecom/api
npm install
API_PORT=4003 node server.js    # terminal C
```

The `API_PORT=4003` is required: `api/server.js` defaults to port 4001, which
collides with `orders_api`.

### 5. Start the web app

```bash
cd ecom/web
npm install
npm run dev                     # terminal D, listens on :8081
```

### 6. Verify

Open http://localhost:8081. The ORDERS tab should render page 1 of 2000 with
100,000 rows. Click NEXT and PREVIOUS; each click fires a fresh
`GET /api/orders?page=N&page_size=50`.

Or check each tier with curl:

```bash
curl localhost:8081/api/orders?page=1\&page_size=2     # through the BFF proxy
curl localhost:4001/orders?page=1\&page_size=2         # Rust + Redis
curl localhost:4002/shipment/1                          # single row by id
curl localhost:4003/users?page=1\&page_size=2          # Fastify + Postgres
curl localhost:4001/health && curl localhost:4002/health && curl localhost:4003/health
```

## Services and ports

| Service | Port | Start command | Source | Data |
| --- | --- | --- | --- | --- |
| SolidStart web (BFF) | 8081 | `npm run dev` in `web/` | this repo | proxies everything below |
| orders_api | 4001 | `cargo run --bin orders_api` in `../ecomrust` | ecomrust | Redis |
| shipments_api | 4002 | `cargo run --bin shipments_api` in `../ecomrust` | ecomrust | Redis |
| legacy Fastify API | 4003 | `API_PORT=4003 node server.js` in `api/` | this repo | PostgreSQL |
| gRPC server (optional) | 50051 | `cargo run --bin grpc_server` in `../ecomrust` | ecomrust | Redis |
| gRPC gateway (optional) | 4000 | `node server.js` in `../ecomrust/gateway` | ecomrust | gRPC + PostgreSQL |

## API reference

### Browser-facing routes (SolidStart BFF, :8081)

`GET /api/{entity}?page=N&page_size=M`

The browser never calls 4001/4002/4003 directly. `web/src/routes/api/[entity].ts`
maps each entity to its upstream and forwards the query string untouched:

| Entity route | Upstream | Served from |
| --- | --- | --- |
| `/api/orders` | `http://localhost:4001/orders` | Redis via Rust |
| `/api/shipments` | `http://localhost:4002/shipments` | Redis via Rust |
| `/api/users` | `http://localhost:4003/users` | PostgreSQL via Fastify |
| `/api/logins` | `http://localhost:4003/logins` | PostgreSQL via Fastify |
| `/api/shopping-carts` | `http://localhost:4003/shopping-carts` | PostgreSQL via Fastify |
| `/api/payment-infos` | `http://localhost:4003/payment-infos` | PostgreSQL via Fastify |
| `/api/payments` | `http://localhost:4003/payments` | PostgreSQL via Fastify |
| `/api/shipment-trackings` | `http://localhost:4003/shipment-trackings` | PostgreSQL via Fastify |

Unknown entities get `404 {"error":"unknown entity '...'"}`. An unreachable
upstream gets `502 {"error":"upstream unreachable: ..."}`.

### Rust list endpoints (:4001/orders, :4002/shipments)

Query parameters (validated in `../ecomrust/src/rest.rs`):

| Param | Default | Constraints |
| --- | --- | --- |
| `page` | 1 | integer >= 1 |
| `page_size` | 50 | integer 1..=200 |
| `sort` | `id` | `id` or `order_date` (orders); `id` or `shipment_date` (shipments) |
| `order` | `asc` | `asc` or `desc` |

Response envelope (the legacy Fastify API returns the same shape, minus
`sort`/`order`):

```json
{
  "data": [ { "id": 1, "customer_id": 8123, "order_date": "2026-09-10T04:12:55+00:00", "status": "SHIPPED", "total_amount": "2841.33", "created_at": "...", "updated_at": "..." } ],
  "page": 1,
  "page_size": 50,
  "total_records": 100000,
  "total_pages": 2000,
  "sort": "id",
  "order": "asc"
}
```

Amounts are strings, not floats: Postgres `NUMERIC` is cast to text so exact
decimal precision survives the round trip.

### Single-row endpoints

```
GET localhost:4001/order/{id}     -> OrderJson   (404 if not cached)
GET localhost:4002/shipment/{id}  -> ShipmentJson (404 if not cached)
```

`id` must be >= 1. Both Rust REST APIs and both Fastify services also expose
`GET /health` (the gRPC server has no HTTP health endpoint).

### Error format

All Rust errors render as `{"error": "..."}` with a matching status:
400 for invalid params (`page must be >= 1`, `page_size must be between 1 and
200`, `invalid sort '...'`, `invalid order '...'`), 404 for a missing id, 500
for Redis/Postgres/JSON failures. gRPC maps the same errors to
`INVALID_ARGUMENT` / `NOT_FOUND` / `INTERNAL`.

### gRPC contract (optional path)

`../ecomrust/proto/ecom.proto` defines `OrderService` and `ShipmentService`,
each with `List*` and `Get*` RPCs over HTTP/2 on `:50051`. The same file
generates the Rust tonic handlers and the Node gateway stubs, so both sides
stay in lockstep (claude.md rule #1: evolve additively only, proto3 syntax).
Smoke test with `cargo run --bin grpc_client` while `grpc_server` runs.

## Redis cache layout

Written by `cache_loader` (`../ecomrust/src/cache.rs`), DB 0 at
`redis://localhost:6379/0`:

```
orders:{id}                    JSON string of the order row
orders:index:id                ZSET score=id,           member=id
orders:index:order_date        ZSET score=epoch millis, member=id
shipments:{id}                 JSON string of the shipment row
shipments:index:id             ZSET score=id,           member=id
shipments:index:shipment_date  ZSET score=epoch millis, member=id
```

A list request resolves the page's ids with one `ZRANGE` (asc) or `ZREVRANGE`
(desc) against the sort index, then fetches all row documents in a single
`MGET`. No per-row round trips. Loads are pipelined in 5,000-row batches.

Note on specs.md's "Redis Database: ecomdb": Redis logical databases are
numeric, so the requirement is satisfied by DB 0 plus the `orders:` /
`shipments:` key namespaces.

## Database

`DDL.sql` creates schema `ecommerce` in `ecomdb` with 15 tables. The 8 exposed
through APIs: `order`, `shipment`, `user`, `login`, `shopping_cart`,
`payment_info`, `payment`, `shipment_tracking`. The other 7 (`customer`,
`product`, `order_product`, `product_category`, `shipment_carrier`,
`shipment_tracking_carrier`, `product_category_product`) exist in Postgres and
are seeded, but have no API surface yet. All tables are `BIGSERIAL` ids with
btree indexes on foreign-key-ish and filter columns; `order` and `user` are
quoted identifiers in SQL because they are reserved words.

The API allow-lists in `api/server.js` (and `gateway/server.js`) name every
exposed table and column server-side; client input is never interpolated into
SQL identifiers. `user.password` is deliberately not exposed.

`load_data.py` volumes: 10K customers, 10K users, 10K products, 100
categories, 20 carriers, 100K orders, 100K shipments (1:1), 2 logins per
user, 1-2 products per order, one payment / payment_info / cart / tracking row
per order. Business consistency holds: cart `customer_id` matches its order,
payment amounts equal the order total, carrier tracking reuses the shipment's
tracking number, delivered orders get delivered shipments. Natural keys embed
the row sequence number, so duplicates are impossible by construction.

## Configuration

| Variable | Default | Used by | Purpose |
| --- | --- | --- | --- |
| `ORDERS_API_URL` | `http://localhost:4001` | web BFF proxy | orders upstream |
| `SHIPMENTS_API_URL` | `http://localhost:4002` | web BFF proxy | shipments upstream |
| `LEGACY_API_URL` | `http://localhost:4003` | web BFF proxy | other-entities upstream |
| `DATABASE_URL` | `postgresql://harir@localhost:5432/ecomdb` | api/, cache_loader, gateway | Postgres connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Rust binaries | Redis connection |
| `API_PORT` | `4001` | api/server.js | override to `4003` |
| `GRPC_ADDR` | `localhost:50051` | gateway | gRPC server address |
| `GATEWAY_PORT` | `4000` | gateway | gateway listen port |

## Development rules

`claude.md` is the source of truth for architecture and coding rules;
`AGENTS.md` summarizes the runtime topology. The load-bearing ones:

1. Never change `proto/ecom.proto` without regenerating/updating both the
   Rust tonic handlers and the Node client stubs.
2. SolidJS: do not destructure props (breaks reactivity); use `<Show>` and
   `<For>` instead of ternaries and `.map()` in JSX.
3. Every Fastify route validates query/params/body with Ajv JSON schemas.
4. Rust handlers return `Result<T, E>` with explicit propagation; no panics.
5. No N+1 query patterns: batch (single `MGET`, joined SQL, or pooled
   `Promise.all` like the Fastify count+data pair).

Performance targets from `claude.md`: TTFB < 100ms (SSR), internal RPC
latency < 5ms, Postgres OLTP reads < 20ms with proper indexes.

## Troubleshooting

**ORDERS tab renders "Failed to load ORDERS: API 502"**
The BFF proxy cannot reach the upstream. Check that `orders_api` is running on
4001 (`curl localhost:4001/health`). Same for 4002/4003.

**Lists come back empty (0 rows) but services are up**
Redis was never seeded. Run `cargo run --bin cache_loader` in `../ecomrust`.

**`cargo run --bin orders_api` fails with a connection error**
Redis is not reachable at `redis://localhost:6379/0`. Start Redis or set
`REDIS_URL`.

**Port 4001 already in use when starting the legacy API**
You started `api/server.js` without `API_PORT=4003`; it defaults to 4001 and
collides with `orders_api`. Restart it with `API_PORT=4003 node server.js`.

**`load_data.py` fails to connect**
Postgres is not accepting the default connection string. Create `ecomdb`, run
`DDL.sql` first, and check that the user in the string (default `harir`)
exists, or export `DATABASE_URL` for the API services to match your setup.
