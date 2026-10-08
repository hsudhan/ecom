import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { ENTITIES, fetchPage, reloadCache, type SortOrder } from "~/lib/api";

/**
 * Generic data-grid panel: pagination control (top right) + table below.
 * Specs (specs.md):
 *  - page starts at 1; PREVIOUS floors at 1; NEXT caps at upstream total_pages
 *  - every state change triggers a fresh GET ?page=N&page_size=50
 *  - alternating light/dark gray row shading (handled in app.css)
 *  - RELOAD CACHE (left of pagination) re-seeds this entity's Redis cache
 *    from its PostgreSQL table via POST /api/{entity}/reload-cache, then
 *    resets the grid to page 1
 * Sortable entities (orders, shipments): every column header is a button
 * that sorts ASC first, then toggles ASC/DESC on repeat clicks; any sort
 * change resets the grid to page 1. Sorting runs inside the Rust service's
 * Redis indexes (?sort=&order=), not in the browser.
 * claude.md rules: <Show>/<For> for control flow, props never destructured.
 */
export default function EntityPanel(props: { entity: string; label: string }) {
  // Entity id is fixed per panel instance, so a plain lookup is fine.
  const sortable = ENTITIES.find((e) => e.id === props.entity)?.sortable === true;

  const [page, setPage] = createSignal(1);
  const [sort, setSort] = createSignal("id"); // initial state: id ASC
  const [order, setOrder] = createSignal<SortOrder>("asc");
  const query = createMemo(() => ({ page: page(), sort: sort(), order: order() }));
  const [resource, { refetch }] = createResource(query, (q) =>
    fetchPage(props.entity, q.page, q.sort, q.order)
  );
  const [reloading, setReloading] = createSignal(false);
  const [reloadError, setReloadError] = createSignal<string | null>(null);

  const columns = createMemo<string[]>(() => {
    const rows = resource.latest?.data;
    return rows && rows.length > 0 ? Object.keys(rows[0]) : [];
  });

  const prev = () => setPage((p) => Math.max(1, p - 1));
  const next = () =>
    setPage((p) => Math.min(resource.latest?.total_pages ?? p + 1, p + 1));

  /** New column -> ASC; same column -> toggle. Always back to page 1. */
  const toggleSort = (column: string) => {
    if (sort() === column) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      setOrder("asc");
    }
    setPage(1);
  };

  const reload = async () => {
    setReloading(true);
    setReloadError(null);
    try {
      await reloadCache(props.entity);
      // Reset to page 1; the page change re-fetches. On page 1 already,
      // the signal is a no-op, so force the refetch explicitly.
      if (page() === 1) refetch();
      else setPage(1);
    } catch (err) {
      setReloadError(String(err));
    } finally {
      setReloading(false);
    }
  };

  return (
    <section class="panel" aria-label={`${props.label} panel`}>
      <div class="panel-toolbar">
        <h2>{props.label}</h2>
        <div class="pagination" role="navigation" aria-label={`${props.label} pagination`}>
          <button
            type="button"
            class="reload-cache"
            onClick={reload}
            disabled={reloading()}
            aria-label={`Reload ${props.label} cache from database`}
          >
            {reloading() ? "RELOADING…" : "RELOAD CACHE"}
          </button>
          <span class="page-status" aria-live="polite">
            <Show when={resource.latest} fallback="Loading…">
              {(d) => (
                <>
                  Page {d().page.toLocaleString()} of {d().total_pages.toLocaleString()}
                  {" · "}
                  {d().total_records.toLocaleString()} rows
                </>
              )}
            </Show>
          </span>
          <button
            type="button"
            onClick={prev}
            disabled={page() === 1}
            aria-label="Previous page"
          >
            PREVIOUS
          </button>
          <button
            type="button"
            onClick={next}
            disabled={resource.latest ? page() >= resource.latest!.total_pages : false}
            aria-label="Next page"
          >
            NEXT
          </button>
        </div>
      </div>

      <Show when={resource.error}>
        <p role="alert" class="error">
          Failed to load {props.label}: {String(resource.error)}
        </p>
      </Show>

      <Show when={reloadError()}>
        <p role="alert" class="error">
          Failed to reload {props.label} cache: {reloadError()}
        </p>
      </Show>

      <div class="table-wrap" aria-busy={resource.loading}>
        <Show
          when={resource.latest}
          fallback={<p class="loading">Loading {props.label.toLowerCase()}…</p>}
        >
          {(d) => (
            <table>
              <thead>
                <tr>
                  <For each={columns()}>
                    {(c) => (
                      <Show
                        when={sortable}
                        fallback={<th scope="col">{c}</th>}
                      >
                        <th
                          scope="col"
                          aria-sort={
                            sort() === c
                              ? order() === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <button
                            type="button"
                            class="sort-header"
                            onClick={() => toggleSort(c)}
                            aria-label={`Sort by ${c}`}
                          >
                            {c}
                            <span class="sort-indicator" aria-hidden="true">
                              {sort() === c ? (order() === "asc" ? "▲" : "▼") : ""}
                            </span>
                          </button>
                        </th>
                      </Show>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={d().data}>
                  {(row) => (
                    <tr>
                      <For each={columns()}>
                        {(c) => <td>{formatCell(row[c])}</td>}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          )}
        </Show>
      </div>
    </section>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    // ISO timestamp -> compact readable form
    return value.replace("T", " ").slice(0, 19);
  }
  return String(value);
}
