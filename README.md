# Ecommerce Admin

A multi-tier ecommerce admin app. A SolidJS/SolidStart web UI browses 8
paginated entity views (orders, shipments, users, logins, shopping carts,
payment infos, payments, shipment trackings) backed by 100K orders and 100K
shipments. Every entity is served by a small Rust service that reads from a
Redis cache first and falls back to the PostgreSQL table on a cache miss
(cache-aside). The browser only ever talks to the SolidStart server, which
proxies each request to the right upstream.

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
        │  one Rust actix-web API per entity, each Redis-first
        │  with PostgreSQL fallback on cache miss:
        │
        │    orders             :4001 ─┐
        │    shipments          :4002 ─┤
        │    users              :4003 ─┤
        │    logins             :4004 ─┼── reads ──► [ Redis :6379 ]
        │    shopping-carts     :4005 ─┤      │
        │    payment-infos      :4006 ─┤      │ cache miss
        │    payments           :4007 ─┤      ▼
        │    shipment-trackings :4008 ─┘  [ PostgreSQL :5432 ]
        │                                 ecomdb, schema `ecommerce`
        │                                 (primary storage, 15 tables)

[ legacy Fastify API :4010 ]  api/  (this repo)
  manual fallback only — reads Postgres directly; not wired into the proxy
```

Why the proxy exists: the Rust services carry no CORS middleware, so the
SolidStart server forwards `/api/{entity}` server-side and the browser stays
same-origin. Upstream bases are env-overridable (`ORDERS_API_URL`,
`SHIPMENTS_API_URL`, `USERS_API_URL`, `LOGINS_API_URL`,
`SHOPPING_CARTS_API_URL`, `PAYMENT_INFOS_API_URL`, `PAYMENTS_API_URL`,
`SHIPMENT_TRACKINGS_API_URL`).

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
├── api/server.js         legacy Fastify API, port 4010 (Postgres reads)
├── DDL.sql               15-table `ecommerce` schema for ecomdb
├── load_data.py          seeded random data loader (100K orders/shipments)
├── specs.md              UI + pagination spec
└── claude.md             architecture + coding rules

../ecomrust/              ← sibling repo
├── src/bin/orders_api.rs              REST :4001 (Redis-first)
├── src/bin/shipments_api.rs           REST :4002 (Redis-first)
├── src/bin/users_api.rs               REST :4003 (Redis-first)
├── src/bin/logins_api.rs              REST :4004 (Redis-first)
├── src/bin/shopping_carts_api.rs      REST :4005 (Redis-first)
├── src/bin/payment_infos_api.rs       REST :4006 (Redis-first)
├── src/bin/payments_api.rs            REST :4007 (Redis-first)
├── src/bin/shipment_trackings_api.rs  REST :4008 (Redis-first)
├── src/bin/cache_loader.rs            Postgres -> Redis loader (all 8 tables)
├── src/bin/grpc_server.rs             tonic gRPC :50051
├── src/bin/grpc_client.rs             gRPC smoke test
├── src/cache.rs               Redis key layout + list/get/load logic
├── src/db.rs                  sqlx Postgres access (loader + cache misses)
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

Run each service in its own terminal. The database must be seeded first;
after that the Rust APIs can serve everything (they fall back to PostgreSQL
on any cache miss, but pre-loading the cache keeps first reads fast). `cd`
commands below are given from the workspace root (the directory containing
both the `ecom/` and `ecomrust/` clones).

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

Expected output: one `fetched` / `loaded` line per table (orders, shipments,
users, logins, shopping-carts, payment-infos, payments, shipment-trackings),
then `done`. This step is recommended but optional: every Rust API is
cache-aside, so a cold cache is loaded from PostgreSQL automatically on the
first request for that entity.

### 3. Start the Rust APIs

Start all eight in the background with one command:

```bash
cd ecomrust
./start_apis.sh
```

The script builds the binaries, launches each service with `nohup`,
health-checks every port, and prints a summary table. Logs live in
`${TMPDIR:-/tmp}/ecomrust-apis/` (override with `LOG_DIR`); stop everything
with `pkill -f 'target/debug/.*_api'`.

Or start them individually, one terminal each:

```bash
cd ecomrust
cargo run --bin orders_api              # terminal A, listens on :4001
cargo run --bin shipments_api           # terminal B, listens on :4002
cargo run --bin users_api               # :4003
cargo run --bin logins_api              # :4004
cargo run --bin shopping_carts_api      # :4005
cargo run --bin payment_infos_api       # :4006
cargo run --bin payments_api            # :4007
cargo run --bin shipment_trackings_api  # :4008
```

### 4. (Optional) Start the legacy Fastify API

```bash
cd ecom/api
npm install
node server.js                    # listens on :4010 (override with API_PORT)
```

Not needed for the web app — the BFF proxy routes all 8 entities to the Rust
services. It remains as a direct-PostgreSQL fallback.

### 5. Start the web app

```bash
cd ecom/web
npm install
npm run dev                     # listens on :8081
```

### 6. Verify

Open http://localhost:8081. The ORDERS tab should render page 1 of 2000 with
100,000 rows. Click NEXT and PREVIOUS; each click fires a fresh
`GET /api/orders?page=N&page_size=50`.

Or check each tier with curl:

```bash
curl localhost:8081/api/orders?page=1\&page_size=2     # through the BFF proxy
curl localhost:8081/api/users?page=1\&page_size=2      # BFF -> Rust users_api
curl localhost:4001/orders?page=1\&page_size=2         # Rust + Redis direct
curl localhost:4003/user/1                              # single row by id
for p in 4001 4002 4003 4004 4005 4006 4007 4008; do curl -s localhost:$p/health; echo; done
```

## Services and ports

| Service | Port | Start command | Source | Data |
| --- | --- | --- | --- | --- |
| SolidStart web (BFF) | 8081 | `npm run dev` in `web/` | this repo | proxies everything below |
| orders_api | 4001 | `cargo run --bin orders_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| shipments_api | 4002 | `cargo run --bin shipments_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| users_api | 4003 | `cargo run --bin users_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| logins_api | 4004 | `cargo run --bin logins_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| shopping_carts_api | 4005 | `cargo run --bin shopping_carts_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| payment_infos_api | 4006 | `cargo run --bin payment_infos_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| payments_api | 4007 | `cargo run --bin payments_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| shipment_trackings_api | 4008 | `cargo run --bin shipment_trackings_api` in `../ecomrust` | ecomrust | Redis-first, Postgres fallback |
| legacy Fastify API (fallback) | 4010 | `node server.js` in `api/` | this repo | PostgreSQL |
| gRPC server (optional) | 50051 | `cargo run --bin grpc_server` in `../ecomrust` | ecomrust | Redis |
| gRPC gateway (optional) | 4000 | `node server.js` in `../ecomrust/gateway` | ecomrust | gRPC + PostgreSQL |

## API reference

### Browser-facing routes (SolidStart BFF, :8081)

`GET /api/{entity}?page=N&page_size=M`

The browser never calls 4001-4008 directly. `web/src/routes/api/[entity].ts`
maps each entity to its upstream and forwards the query string untouched:

| Entity route | Upstream | Served from |
| --- | --- | --- |
| `/api/orders` | `http://localhost:4001/orders` | Redis via Rust (DB on miss) |
| `/api/shipments` | `http://localhost:4002/shipments` | Redis via Rust (DB on miss) |
| `/api/users` | `http://localhost:4003/users` | Redis via Rust (DB on miss) |
| `/api/logins` | `http://localhost:4004/logins` | Redis via Rust (DB on miss) |
| `/api/shopping-carts` | `http://localhost:4005/shopping-carts` | Redis via Rust (DB on miss) |
| `/api/payment-infos` | `http://localhost:4006/payment-infos` | Redis via Rust (DB on miss) |
| `/api/payments` | `http://localhost:4007/payments` | Redis via Rust (DB on miss) |
| `/api/shipment-trackings` | `http://localhost:4008/shipment-trackings` | Redis via Rust (DB on miss) |

Unknown entities get `404 {"error":"unknown entity '...'"}`. An unreachable
upstream gets `502 {"error":"upstream unreachable: ..."}`.

### Rust list endpoints

One list endpoint per service (`:4001/orders`, `:4002/shipments`,
`:4003/users`, `:4004/logins`, `:4005/shopping-carts`, `:4006/payment-infos`,
`:4007/payments`, `:4008/shipment-trackings`), all sharing the same query
parameters (validated in `../ecomrust/src/rest.rs`):

| Param | Default | Constraints |
| --- | --- | --- |
| `page` | 1 | integer >= 1 |
| `page_size` | 50 | integer 1..=200 |
| `sort` | `id` | `id` or the entity's date field: `order_date` (orders), `shipment_date` (shipments), `created_at` (users, shopping-carts), `login_date` (logins), `payment_date` (payment-infos, payments), `updated_at` (shipment-trackings) |
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
GET localhost:4001/order/{id}              -> OrderJson
GET localhost:4002/shipment/{id}           -> ShipmentJson
GET localhost:4003/user/{id}               -> UserJson (no password field)
GET localhost:4004/login/{id}              -> LoginJson
GET localhost:4005/shopping-cart/{id}      -> ShoppingCartJson
GET localhost:4006/payment-info/{id}       -> PaymentInfoJson
GET localhost:4007/payment/{id}            -> PaymentJson
GET localhost:4008/shipment-tracking/{id}  -> ShipmentTrackingJson
```

`id` must be >= 1. Every service also exposes `GET /health` (the gRPC server
has no HTTP health endpoint).

### Cache-aside reads (Redis first, database on miss)

Every request hits Redis first. On a miss, the service reads the PostgreSQL
table, writes the result back into Redis, and then responds:

- **Single row**: a missing `{prefix}:{id}` key triggers
  `SELECT ... WHERE id = $1`; a row absent from the database too gets a 404.
- **List**: a missing `{prefix}:index:id` sort index (cache never loaded)
  triggers a full-table load of that entity before the page is served.

`user.password` is never selected, cached, or returned.

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

Written by `cache_loader` and by the APIs' cache-aside write-backs
(`../ecomrust/src/cache.rs`), DB 0 at `redis://localhost:6379/0`. Each entity
uses the same three-key pattern under its own prefix (`orders:`,
`shipments:`, `users:`, `logins:`, `shopping-carts:`, `payment-infos:`,
`payments:`, `shipment-trackings:`):

```
{prefix}:{id}                  JSON string of the row
{prefix}:index:id              ZSET score=id,           member=id
{prefix}:index:{date_field}    ZSET score=epoch millis, member=id
```

A list request resolves the page's ids with one `ZRANGE` (asc) or `ZREVRANGE`
(desc) against the sort index, then fetches all row documents in a single
`MGET`. No per-row round trips. Loads are pipelined in 5,000-row batches.

Note on specs.md's "Redis Database: ecomdb": Redis logical databases are
numeric, so the requirement is satisfied by DB 0 plus the per-entity key
namespaces.

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
SQL identifiers. `user.password` is deliberately not exposed — by the legacy
API and by the Rust services alike.

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
| `USERS_API_URL` | `http://localhost:4003` | web BFF proxy | users upstream |
| `LOGINS_API_URL` | `http://localhost:4004` | web BFF proxy | logins upstream |
| `SHOPPING_CARTS_API_URL` | `http://localhost:4005` | web BFF proxy | shopping-carts upstream |
| `PAYMENT_INFOS_API_URL` | `http://localhost:4006` | web BFF proxy | payment-infos upstream |
| `PAYMENTS_API_URL` | `http://localhost:4007` | web BFF proxy | payments upstream |
| `SHIPMENT_TRACKINGS_API_URL` | `http://localhost:4008` | web BFF proxy | shipment-trackings upstream |
| `DATABASE_URL` | `postgresql://harir@localhost:5432/ecomdb` | api/, Rust APIs, cache_loader, gateway | Postgres connection (Rust APIs use it on cache misses) |
| `REDIS_URL` | `redis://localhost:6379/0` | Rust binaries | Redis connection |
| `API_PORT` | `4010` | api/server.js | legacy API listen port |
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

**A tab renders "Failed to load ...: API 502"**
The BFF proxy cannot reach the upstream. Check the matching Rust service is
up, e.g. `curl localhost:4003/health` for the USERS tab. Ports 4001-4008 map
to the tabs in tab-bar order.

**First request for a tab is slow**
That entity's cache was cold; the service loaded its whole table from
PostgreSQL into Redis before responding (one line in the service log:
`cold cache -> loaded N rows`). Subsequent pages are served from memory.
Pre-warm everything with `cargo run --bin cache_loader` in `../ecomrust`.

**`cargo run --bin orders_api` fails with a connection error**
Redis is not reachable at `redis://localhost:6379/0`. Start Redis or set
`REDIS_URL`.

**Port already in use when starting a Rust API**
Something else holds the port (often a previous run of the same binary).
Find and stop it: `lsof -ti :4003 | xargs kill`. Note the legacy Fastify API
now defaults to 4010, so it no longer collides with the Rust services.

**`load_data.py` fails to connect**
Postgres is not accepting the default connection string. Create `ecomdb`, run
`DDL.sql` first, and check that the user in the string (default `harir`)
exists, or export `DATABASE_URL` for the API services to match your setup.
