import { createSignal, For } from "solid-js";
import EntityPanel from "~/components/EntityPanel";
import { ENTITIES } from "~/lib/api";

/**
 * Primary tab bar (specs.md): ORDERS, SHIPMENT, USERS, LOGIN, SHOPPING CART,
 * PAYMENT INFO, PAYMENT, SHIPMENT TRACKING.
 * Clicking a tab renders its panel directly below the tab bar.
 * Panels stay mounted (hidden) so each tab keeps its page state.
 */
export default function Home() {
  const [active, setActive] = createSignal(ENTITIES[0].id);

  return (
    <main>
      <header class="app-header">
        <h1>Ecommerce Admin</h1>
      </header>

      <nav class="tab-bar" role="tablist" aria-label="Data views">
        <For each={ENTITIES}>
          {(e) => (
            <button
              type="button"
              role="tab"
              id={`tab-${e.id}`}
              aria-selected={active() === e.id}
              aria-controls={`panel-${e.id}`}
              class="tab"
              onClick={() => setActive(e.id)}
            >
              {e.label}
            </button>
          )}
        </For>
      </nav>

      <For each={ENTITIES}>
        {(e) => (
          <div
            role="tabpanel"
            id={`panel-${e.id}`}
            aria-labelledby={`tab-${e.id}`}
            hidden={active() !== e.id}
          >
            <EntityPanel entity={e.id} label={e.label} />
          </div>
        )}
      </For>
    </main>
  );
}
