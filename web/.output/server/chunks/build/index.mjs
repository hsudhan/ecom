import { ssr, ssrHydrationKey, escape, createComponent, ssrAttribute, isServer, getRequestEvent } from 'solid-js/web';
import { createSignal, For, createResource, createMemo, Show } from 'solid-js';

const h = "/api";
function E() {
  var _a, _b;
  if (!isServer) return h;
  const e = getRequestEvent();
  return (((_a = e == null ? void 0 : e.request) == null ? void 0 : _a.url) ? new URL(e.request.url).origin : `http://localhost:${(_b = process.env.PORT) != null ? _b : 8081}`) + h;
}
const P = 50, p = [{ id: "orders", label: "ORDERS" }, { id: "shipments", label: "SHIPMENT" }, { id: "users", label: "USERS" }, { id: "logins", label: "LOGIN" }, { id: "shopping-carts", label: "SHOPPING CART" }, { id: "payment-infos", label: "PAYMENT INFO" }, { id: "payments", label: "PAYMENT" }, { id: "shipment-trackings", label: "SHIPMENT TRACKING" }];
async function _(e, o) {
  const a = await fetch(`${E()}/${e}?page=${o}&page_size=${P}`);
  if (!a.ok) throw new Error(`API ${a.status}: ${await a.text()}`);
  return await a.json();
}
var w = ["<p", ' role="alert" class="error">Failed to load <!--$-->', "<!--/-->: <!--$-->", "<!--/--></p>"], I = ["<section", ' class="panel" aria-label="', '"><div class="panel-toolbar"><h2>', '</h2><div class="pagination" role="navigation" aria-label="', '"><span class="page-status" aria-live="polite">', '</span><button type="button"', ' aria-label="Previous page">PREVIOUS</button><button type="button"', ' aria-label="Next page">NEXT</button></div></div><!--$-->', '<!--/--><div class="table-wrap"', ">", "</div></section>"], T = ["<p", ' class="loading">Loading <!--$-->', "<!--/-->\u2026</p>"], A = ["<table", "><thead><tr>", "</tr></thead><tbody>", "</tbody></table>"], N = ["<th", ' scope="col">', "</th>"], R = ["<tr", ">", "</tr>"], L = ["<td", ">", "</td>"];
function O(e) {
  const [o, a] = createSignal(1), [s] = createResource(o, (r) => _(e.entity, r)), g = createMemo(() => {
    var _a;
    const r = (_a = s.latest) == null ? void 0 : _a.data;
    return r && r.length > 0 ? Object.keys(r[0]) : [];
  });
  return ssr(I, ssrHydrationKey(), `${escape(e.label, true)} panel`, escape(e.label), `${escape(e.label, true)} pagination`, escape(createComponent(Show, { get when() {
    return s.latest;
  }, fallback: "Loading\u2026", children: (r) => ["Page ", r().page.toLocaleString(), " of ", r().total_pages.toLocaleString(), " \xB7 ", r().total_records.toLocaleString(), " rows"] })), ssrAttribute("disabled", o() === 1, true), ssrAttribute("disabled", s.latest ? o() >= s.latest.total_pages : false, true), escape(createComponent(Show, { get when() {
    return s.error;
  }, get children() {
    return ssr(w, ssrHydrationKey(), escape(e.label), escape(String(s.error)));
  } })), ssrAttribute("aria-busy", escape(s.loading, true), false), escape(createComponent(Show, { get when() {
    return s.latest;
  }, get fallback() {
    return ssr(T, ssrHydrationKey(), escape(e.label.toLowerCase()));
  }, children: (r) => ssr(A, ssrHydrationKey(), escape(createComponent(For, { get each() {
    return g();
  }, children: (u) => ssr(N, ssrHydrationKey(), escape(u)) })), escape(createComponent(For, { get each() {
    return r().data;
  }, children: (u) => ssr(R, ssrHydrationKey(), escape(createComponent(For, { get each() {
    return g();
  }, children: (m) => ssr(L, ssrHydrationKey(), escape(k(u[m]))) }))) }))) })));
}
function k(e) {
  return e == null ? "" : typeof e == "string" && /^\d{4}-\d{2}-\d{2}T/.test(e) ? e.replace("T", " ").slice(0, 19) : String(e);
}
var C = ["<main", '><header class="app-header"><h1>Ecommerce Admin</h1></header><nav class="tab-bar" role="tablist" aria-label="Data views">', "</nav><!--$-->", "<!--/--></main>"], H = ["<button", ' type="button" role="tab" id="', '"', ' aria-controls="', '" class="tab">', "</button>"], M = ["<div", ' role="tabpanel" id="', '" aria-labelledby="', '"', ">", "</div>"];
function x() {
  const [e, o] = createSignal(p[0].id);
  return ssr(C, ssrHydrationKey(), escape(createComponent(For, { each: p, children: (a) => ssr(H, ssrHydrationKey(), `tab-${escape(a.id, true)}`, ssrAttribute("aria-selected", escape(e(), true) === escape(a.id, true), false), `panel-${escape(a.id, true)}`, escape(a.label)) })), escape(createComponent(For, { each: p, children: (a) => ssr(M, ssrHydrationKey(), `panel-${escape(a.id, true)}`, `tab-${escape(a.id, true)}`, ssrAttribute("hidden", e() !== a.id, true), escape(createComponent(O, { get entity() {
    return a.id;
  }, get label() {
    return a.label;
  } }))) })));
}

export { x as default };
//# sourceMappingURL=index.mjs.map
