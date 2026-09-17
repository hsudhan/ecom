# AGENTS.md

Multi-tier ecommerce app. See `claude.md` for the architecture (Browser/SolidJS → SolidStart BFF → API tier → Rust → Redis/Postgres) and coding rules, and `specs.md` for the UI spec.

## Runtime topology

| Service | Port | Command | Source |
| --- | --- | --- | --- |
| SolidStart web (BFF) | 8081 | `npm run dev` (in `web/`) | `web/` |
| Rust orders_api (Redis) | 4001 | `cargo run --bin orders_api` (in `../ecomrust`) | `../ecomrust` |
| Rust shipments_api (Redis) | 4002 | `cargo run --bin shipments_api` (in `../ecomrust`) | `../ecomrust` |
| Legacy Fastify API (Postgres) | 4003 | `API_PORT=4003 node server.js` (in `api/`) | `api/` |

- Browser never calls 4001/4002/4003 directly: `web/src/lib/api.ts` fetches same-origin `/api/{entity}`, proxied server-side by `web/src/routes/api/[entity].ts` (orders→4001, shipments→4002, others→4003).
- Redis must be seeded via `cargo run --bin cache_loader` (in `../ecomrust`) before the Rust APIs return data.

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
