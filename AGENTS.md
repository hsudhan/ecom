# AGENTS.md

Multi-tier ecommerce app. See `claude.md` for the architecture (Browser/SolidJS → SolidStart BFF → API tier → Rust → Redis/Postgres) and coding rules, and `specs.md` for the UI spec.

## Runtime topology

| Service | Port | Command | Source |
| --- | --- | --- | --- |
| SolidStart web (BFF) | 8081 | `npm run dev` (in `web/`) | `web/` |
| Rust orders_api (Redis) | 4001 | `cargo run --bin orders_api` (in `../ecomrust`) | `../ecomrust` |
| Rust shipments_api (Redis) | 4002 | `cargo run --bin shipments_api` (in `../ecomrust`) | `../ecomrust` |
| Rust users_api (Redis) | 4003 | `cargo run --bin users_api` (in `../ecomrust`) | `../ecomrust` |
| Rust logins_api (Redis) | 4004 | `cargo run --bin logins_api` (in `../ecomrust`) | `../ecomrust` |
| Rust shopping_carts_api (Redis) | 4005 | `cargo run --bin shopping_carts_api` (in `../ecomrust`) | `../ecomrust` |
| Rust payment_infos_api (Redis) | 4006 | `cargo run --bin payment_infos_api` (in `../ecomrust`) | `../ecomrust` |
| Rust payments_api (Redis) | 4007 | `cargo run --bin payments_api` (in `../ecomrust`) | `../ecomrust` |
| Rust shipment_trackings_api (Redis) | 4008 | `cargo run --bin shipment_trackings_api` (in `../ecomrust`) | `../ecomrust` |
| Legacy Fastify API (Postgres, fallback) | 4010 | `node server.js` (in `api/`) | `api/` |

- Start all 8 Rust APIs in the background with one command: `./start_apis.sh` (in `../ecomrust`; builds first, logs to `${TMPDIR:-/tmp}/ecomrust-apis/`, stop with `pkill -f 'target/debug/.*_api'`).
- Browser never calls 4001-4008 directly: `web/src/lib/api.ts` fetches same-origin `/api/{entity}`, proxied server-side by `web/src/routes/api/[entity].ts` (orders→4001, shipments→4002, users→4003, logins→4004, shopping-carts→4005, payment-infos→4006, payments→4007, shipment-trackings→4008).
- All Rust APIs are cache-aside: every read hits Redis first and falls back to the PostgreSQL table on a cache miss (single doc or cold cache), writing the result back into Redis. `cargo run --bin cache_loader` (in `../ecomrust`) pre-seeds all 8 tables so the first request is never a miss.
- The legacy Fastify API on 4010 is a manual fallback only; the BFF proxy no longer routes to it.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
