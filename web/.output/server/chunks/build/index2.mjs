import { ssr, ssrHydrationKey, escape, createComponent, ssrAttribute, isServer, getRequestEvent } from 'solid-js/web';
import { createSignal, For, createMemo, createResource, Show } from 'solid-js';

const v = "/api";
function I() {
  var _a, _b;
  if (!isServer) return v;
  const t = getRequestEvent();
  return (((_a = t == null ? void 0 : t.request) == null ? void 0 : _a.url) ? new URL(t.request.url).origin : `http://localhost:${(_b = process.env.PORT) != null ? _b : 8081}`) + v;
}
const N = 50, h = [{ id: "orders", label: "ORDERS", sortable: true }, { id: "shipments", label: "SHIPMENT", sortable: true }, { id: "users", label: "USERS" }, { id: "logins", label: "LOGIN" }, { id: "shopping-carts", label: "SHOPPING CART" }, { id: "payment-infos", label: "PAYMENT INFO" }, { id: "payments", label: "PAYMENT" }, { id: "shipment-trackings", label: "SHIPMENT TRACKING" }];
async function T(t, b, a = "id", m = "asc") {
  const s = await fetch(`${I()}/${t}?page=${b}&page_size=${N}&sort=${encodeURIComponent(a)}&order=${m}`);
  if (!s.ok) throw new Error(`API ${s.status}: ${await s.text()}`);
  return await s.json();
}
var L = ["<p", ' role="alert" class="error">Failed to load <!--$-->', "<!--/-->: <!--$-->", "<!--/--></p>"], O = ["<p", ' role="alert" class="error">Failed to reload <!--$-->', "<!--/--> cache: <!--$-->", "<!--/--></p>"], C = ["<section", ' class="panel" aria-label="', '"><div class="panel-toolbar"><h2>', '</h2><div class="pagination" role="navigation" aria-label="', '"><button type="button" class="reload-cache"', ' aria-label="', '">', '</button><span class="page-status" aria-live="polite">', '</span><button type="button"', ' aria-label="Previous page">PREVIOUS</button><button type="button"', ' aria-label="Next page">NEXT</button></div></div><!--$-->', "<!--/--><!--$-->", '<!--/--><div class="table-wrap"', ">", "</div></section>"], k = ["<p", ' class="loading">Loading <!--$-->', "<!--/-->\u2026</p>"], H = ["<table", "><thead><tr>", "</tr></thead><tbody>", "</tbody></table>"], G = ["<th", ' scope="col"', '><button type="button" class="sort-header" aria-label="', '"><!--$-->', '<!--/--><span class="sort-indicator" aria-hidden="true">', "</span></button></th>"], M = ["<th", ' scope="col">', "</th>"], D = ["<tr", ">", "</tr>"], F = ["<td", ">", "</td>"];
function U(t) {
  var _a;
  const b = ((_a = h.find((r) => r.id === t.entity)) == null ? void 0 : _a.sortable) === true, [a, m] = createSignal(1), [s, K] = createSignal("id"), [$, Y] = createSignal("asc"), _ = createMemo(() => ({ page: a(), sort: s(), order: $() })), [i, { refetch: z }] = createResource(_, (r) => T(t.entity, r.page, r.sort, r.order)), [f, V] = createSignal(false), [y, X] = createSignal(null), E = createMemo(() => {
    var _a2;
    const r = (_a2 = i.latest) == null ? void 0 : _a2.data;
    return r && r.length > 0 ? Object.keys(r[0]) : [];
  });
  return ssr(C, ssrHydrationKey(), `${escape(t.label, true)} panel`, escape(t.label), `${escape(t.label, true)} pagination`, ssrAttribute("disabled", f(), true), `Reload ${escape(t.label, true)} cache from database`, f() ? "RELOADING\u2026" : "RELOAD CACHE", escape(createComponent(Show, { get when() {
    return i.latest;
  }, fallback: "Loading\u2026", children: (r) => ["Page ", r().page.toLocaleString(), " of ", r().total_pages.toLocaleString(), " \xB7 ", r().total_records.toLocaleString(), " rows"] })), ssrAttribute("disabled", a() === 1, true), ssrAttribute("disabled", i.latest ? a() >= i.latest.total_pages : false, true), escape(createComponent(Show, { get when() {
    return i.error;
  }, get children() {
    return ssr(L, ssrHydrationKey(), escape(t.label), escape(String(i.error)));
  } })), escape(createComponent(Show, { get when() {
    return y();
  }, get children() {
    return ssr(O, ssrHydrationKey(), escape(t.label), escape(y()));
  } })), ssrAttribute("aria-busy", escape(i.loading, true), false), escape(createComponent(Show, { get when() {
    return i.latest;
  }, get fallback() {
    return ssr(k, ssrHydrationKey(), escape(t.label.toLowerCase()));
  }, children: (r) => ssr(H, ssrHydrationKey(), escape(createComponent(For, { get each() {
    return E();
  }, children: (c) => createComponent(Show, { when: b, get fallback() {
    return ssr(M, ssrHydrationKey(), escape(c));
  }, get children() {
    return ssr(G, ssrHydrationKey(), ssrAttribute("aria-sort", s() === c ? $() === "asc" ? "ascending" : "descending" : "none", false), `Sort by ${escape(c, true)}`, escape(c), s() === c ? $() === "asc" ? "\u25B2" : "\u25BC" : "");
  } }) })), escape(createComponent(For, { get each() {
    return r().data;
  }, children: (c) => ssr(D, ssrHydrationKey(), escape(createComponent(For, { get each() {
    return E();
  }, children: (w) => ssr(F, ssrHydrationKey(), escape(x(c[w]))) }))) }))) })));
}
function x(t) {
  return t == null ? "" : typeof t == "string" && /^\d{4}-\d{2}-\d{2}T/.test(t) ? t.replace("T", " ").slice(0, 19) : String(t);
}
var j = ["<main", '><header class="app-header"><h1>Ecommerce Admin</h1></header><nav class="tab-bar" role="tablist" aria-label="Data views">', "</nav><!--$-->", "<!--/--></main>"], q = ["<button", ' type="button" role="tab" id="', '"', ' aria-controls="', '" class="tab">', "</button>"], B = ["<div", ' role="tabpanel" id="', '" aria-labelledby="', '"', ">", "</div>"];
function Q() {
  const [t, b] = createSignal(h[0].id);
  return ssr(j, ssrHydrationKey(), escape(createComponent(For, { each: h, children: (a) => ssr(q, ssrHydrationKey(), `tab-${escape(a.id, true)}`, ssrAttribute("aria-selected", escape(t(), true) === escape(a.id, true), false), `panel-${escape(a.id, true)}`, escape(a.label)) })), escape(createComponent(For, { each: h, children: (a) => ssr(B, ssrHydrationKey(), `panel-${escape(a.id, true)}`, `tab-${escape(a.id, true)}`, ssrAttribute("hidden", t() !== a.id, true), escape(createComponent(U, { get entity() {
    return a.id;
  }, get label() {
    return a.label;
  } }))) })));
}

export { Q as default };
//# sourceMappingURL=index2.mjs.map
