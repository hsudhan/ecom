import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { fetchPage } from "~/lib/api";

/**
 * Generic data-grid panel: pagination control (top right) + table below.
 * Specs (specs.md):
 *  - page starts at 1; PREVIOUS floors at 1; NEXT caps at upstream total_pages
 *  - every state change triggers a fresh GET ?page=N&page_size=50
 *  - alternating light/dark gray row shading (handled in app.css)
 * claude.md rules: <Show>/<For> for control flow, props never destructured.
 */
export default function EntityPanel(props: { entity: string; label: string }) {
  const [page, setPage] = createSignal(1);
  const [resource] = createResource(page, (p) => fetchPage(props.entity, p));

  const columns = createMemo<string[]>(() => {
    const rows = resource.latest?.data;
    return rows && rows.length > 0 ? Object.keys(rows[0]) : [];
  });

  const prev = () => setPage((p) => Math.max(1, p - 1));
  const next = () =>
    setPage((p) => Math.min(resource.latest?.total_pages ?? p + 1, p + 1));

  return (
    <section class="panel" aria-label={`${props.label} panel`}>
      <div class="panel-toolbar">
        <h2>{props.label}</h2>
        <div class="pagination" role="navigation" aria-label={`${props.label} pagination`}>
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

      <div class="table-wrap" aria-busy={resource.loading}>
        <Show
          when={resource.latest}
          fallback={<p class="loading">Loading {props.label.toLowerCase()}…</p>}
        >
          {(d) => (
            <table>
              <thead>
                <tr>
                  <For each={columns()}>{(c) => <th scope="col">{c}</th>}</For>
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
