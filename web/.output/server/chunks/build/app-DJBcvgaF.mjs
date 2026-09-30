import { createComponent, isServer, getRequestEvent, useAssets, ssr, spread, escape, delegateEvents } from 'solid-js/web';
import { Suspense, createEffect, on, onCleanup, createSignal, sharedConfig, createContext, createUniqueId, children, createMemo, getOwner, useContext, createRenderEffect, runWithOwner, untrack, Show, createRoot, startTransition, resetErrorBoundaries, batch, createComponent as createComponent$1 } from 'solid-js';
import { F as Ft } from '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:async_hooks';
import 'vinxi/lib/invariant';
import 'vinxi/lib/path';
import 'node:url';
import 'solid-js/web/storage';
import 'seroval';
import 'seroval-plugins/web';

const he = createContext(), me = ["title", "meta"], V = [], z = ["name", "http-equiv", "content", "charset", "media"].concat(["property"]), W = (e, t) => {
  const n = Object.fromEntries(Object.entries(e.props).filter(([o]) => t.includes(o)).sort());
  return (Object.hasOwn(n, "name") || Object.hasOwn(n, "property")) && (n.name = n.name || n.property, delete n.property), e.tag + JSON.stringify(n);
};
function Me() {
  if (!sharedConfig.context) {
    const n = document.head.querySelectorAll("[data-sm]");
    Array.prototype.forEach.call(n, (o) => o.parentNode.removeChild(o));
  }
  const e = /* @__PURE__ */ new Map();
  function t(n) {
    if (n.ref) return n.ref;
    let o = document.querySelector(`[data-sm="${n.id}"]`);
    return o ? (o.tagName.toLowerCase() !== n.tag && (o.parentNode && o.parentNode.removeChild(o), o = document.createElement(n.tag)), o.removeAttribute("data-sm")) : o = document.createElement(n.tag), o;
  }
  return { addTag(n) {
    if (me.indexOf(n.tag) !== -1) {
      const a = n.tag === "title" ? V : z, s = W(n, a);
      e.has(s) || e.set(s, []);
      let i = e.get(s), c = i.length;
      i = [...i, n], e.set(s, i);
      let l = t(n);
      n.ref = l, spread(l, n.props);
      let d = null;
      for (var o = c - 1; o >= 0; o--) if (i[o] != null) {
        d = i[o];
        break;
      }
      return l.parentNode != document.head && document.head.appendChild(l), d && d.ref && d.ref.parentNode && document.head.removeChild(d.ref), c;
    }
    let r = t(n);
    return n.ref = r, spread(r, n.props), r.parentNode != document.head && document.head.appendChild(r), -1;
  }, removeTag(n, o) {
    const r = n.tag === "title" ? V : z, a = W(n, r);
    if (n.ref) {
      const s = e.get(a);
      if (s) {
        if (n.ref.parentNode) {
          n.ref.parentNode.removeChild(n.ref);
          for (let i = o - 1; i >= 0; i--) s[i] != null && document.head.appendChild(s[i].ref);
        }
        s[o] = null, e.set(a, s);
      } else n.ref.parentNode && n.ref.parentNode.removeChild(n.ref);
    }
  } };
}
function We() {
  const e = [];
  return useAssets(() => ssr(Ve(e))), { addTag(t) {
    if (me.indexOf(t.tag) !== -1) {
      const n = t.tag === "title" ? V : z, o = W(t, n), r = e.findIndex((a) => a.tag === t.tag && W(a, n) === o);
      r !== -1 && e.splice(r, 1);
    }
    return e.push(t), e.length;
  }, removeTag(t, n) {
  } };
}
const De = (e) => {
  const t = isServer ? We() : Me();
  return createComponent(he.Provider, { value: t, get children() {
    return e.children;
  } });
}, Je = (e, t, n) => (He({ tag: e, props: t, setting: n, id: createUniqueId(), get name() {
  return t.name || t.property;
} }), null);
function He(e) {
  const t = useContext(he);
  if (!t) throw new Error("<MetaProvider /> should be in the tree");
  createRenderEffect(() => {
    const n = t.addTag(e);
    onCleanup(() => t.removeTag(e, n));
  });
}
function Ve(e) {
  return e.map((t) => {
    var _a, _b;
    const o = Object.keys(t.props).map((a) => a === "children" ? "" : ` ${a}="${escape(t.props[a], true)}"`).join("");
    let r = t.props.children;
    return Array.isArray(r) && (r = r.join("")), ((_a = t.setting) == null ? void 0 : _a.close) ? `<${t.tag} data-sm="${t.id}"${o}>${((_b = t.setting) == null ? void 0 : _b.escape) ? escape(r) : r || ""}</${t.tag}>` : `<${t.tag} data-sm="${t.id}"${o}/>`;
  }).join("");
}
const ze = (e) => Je("title", e, { escape: true, close: true });
function pe() {
  let e = /* @__PURE__ */ new Set();
  function t(r) {
    return e.add(r), () => e.delete(r);
  }
  let n = false;
  function o(r, a) {
    if (n) return !(n = false);
    const s = { defaultPrevented: false, preventDefault: () => s.defaultPrevented = true };
    for (const i of e) i.listener({ to: r, options: a, get defaultPrevented() {
      return s.defaultPrevented;
    }, preventDefault: s.preventDefault, from: i.location, retry: (c) => {
      c && (n = true), i.navigate(r, { ...a, resolve: false });
    } });
    return !s.defaultPrevented;
  }
  return { subscribe: t, confirm: o };
}
let Y;
function J() {
  (!window.history.state || window.history.state._depth == null) && window.history.replaceState({ ...window.history.state, _depth: window.history.length - 1 }, ""), Y = window.history.state._depth;
}
isServer || J();
function Ye(e) {
  return { ...e, _depth: window.history.state && window.history.state._depth };
}
function Ge(e, t) {
  let n = false;
  return () => {
    const o = Y;
    J();
    const r = o == null ? null : Y - o;
    if (n) {
      n = false;
      return;
    }
    r && t(r) ? (n = true, window.history.go(-r)) : e();
  };
}
const Xe = /^(?:[a-z0-9]+:)?\/\//i, Qe = /^\/+|(\/)\/+$/g, G = "http://sr";
function F(e, t = false) {
  const n = e.replace(Qe, "$1");
  return n ? t || /^[?#]/.test(n) ? n : "/" + n : "";
}
function K(e, t, n) {
  if (Xe.test(t)) return;
  const o = F(e), r = n && F(n);
  let a = "";
  return !r || t.startsWith("/") ? a = o : r.toLowerCase().indexOf(o.toLowerCase()) !== 0 ? a = o + r : a = r, (a || "/") + F(t, !a);
}
function Ze(e, t) {
  return F(e).replace(/\/*(\*.*)?$/g, "") + F(t);
}
function ge(e) {
  const t = {};
  return e.searchParams.forEach((n, o) => {
    o in t ? Array.isArray(t[o]) ? t[o].push(n) : t[o] = [t[o], n] : t[o] = n;
  }), t;
}
function et(e, t, n) {
  const [o, r] = e.split("/*", 2), a = o.split("/").filter(Boolean), s = a.length;
  return (i) => {
    const c = i.split("/");
    if (c[0] === "" && c.shift(), c.length && c[c.length - 1] === "" && c.pop(), c.includes("")) return null;
    const l = c.length - s;
    if (l < 0 || l > 0 && r === void 0 && !t) return null;
    const d = { path: s ? "" : "/", params: {} }, w = (m) => n === void 0 ? void 0 : n[m];
    for (let m = 0; m < s; m++) {
      const p = a[m], b = p[0] === ":", u = b ? c[m] : c[m].toLowerCase(), f = b ? p.slice(1) : p.toLowerCase();
      if (b && H(u, w(f))) d.params[f] = u;
      else if (b || !H(u, f)) return null;
      d.path += `/${u}`;
    }
    if (r) {
      const m = l ? c.slice(-l).join("/") : "";
      if (H(m, w(r))) d.params[r] = m;
      else return null;
    }
    return d;
  };
}
function H(e, t) {
  const n = (o) => o === e;
  return t === void 0 ? true : typeof t == "string" ? n(t) : typeof t == "function" ? t(e) : Array.isArray(t) ? t.some(n) : t instanceof RegExp ? t.test(e) : false;
}
function tt(e) {
  const [t, n] = e.pattern.split("/*", 2), o = t.split("/").filter(Boolean);
  return o.reduce((r, a) => r + (a.startsWith(":") ? 2 : 3), o.length - (n === void 0 ? 0 : 1));
}
function we(e) {
  const t = /* @__PURE__ */ new Map(), n = getOwner();
  return new Proxy({}, { get(o, r) {
    return t.has(r) || runWithOwner(n, () => t.set(r, createMemo(() => e()[r]))), t.get(r)();
  }, getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  }, ownKeys() {
    return Reflect.ownKeys(e());
  }, has(o, r) {
    return r in e();
  } });
}
function ye(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t) return [e];
  let n = e.slice(0, t.index), o = e.slice(t.index + t[0].length);
  const r = [n, n += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(o); ) r.push(n += t[1]), o = o.slice(t[0].length);
  return ye(o).reduce((a, s) => [...a, ...r.map((i) => i + s)], []);
}
const nt = 100, rt = createContext(), ve = createContext(), ot = (e) => encodeURIComponent(e).replace(/%(2B|40|3A|24|26|2C|3B|3D)/g, (t) => decodeURIComponent(t));
function at(e, t = "") {
  const { component: n, preload: o, load: r, children: a, info: s } = e, i = !a || Array.isArray(a) && !a.length, c = { key: e, component: n, preload: o || r, info: s };
  return be(e.path).reduce((l, d) => {
    for (const w of ye(d)) {
      const m = Ze(t, w);
      let p = i ? m : m.split("/*", 1)[0];
      p = p.split("/").map((b) => b.startsWith(":") || b.startsWith("*") ? b : ot(b)).join("/"), l.push({ ...c, originalPath: d, pattern: p, matcher: et(p, !i, e.matchFilters) });
    }
    return l;
  }, []);
}
function st(e, t = 0) {
  return { routes: e, score: tt(e[e.length - 1]) * 1e4 - t, matcher(n) {
    const o = [];
    for (let r = e.length - 1; r >= 0; r--) {
      const a = e[r], s = a.matcher(n);
      if (!s) return null;
      o.unshift({ ...s, route: a });
    }
    return o;
  } };
}
function be(e) {
  return Array.isArray(e) ? e : [e];
}
function Pe(e, t = "", n = [], o = []) {
  const r = be(e);
  for (let a = 0, s = r.length; a < s; a++) {
    const i = r[a];
    if (i && typeof i == "object") {
      i.hasOwnProperty("path") || (i.path = "");
      const c = at(i, t);
      for (const l of c) {
        n.push(l);
        const d = Array.isArray(i.children) && i.children.length === 0;
        if (i.children && !d) Pe(i.children, l.pattern, n, o);
        else {
          const w = st([...n], o.length);
          o.push(w);
        }
        n.pop();
      }
    }
  }
  return n.length ? o : o.sort((a, s) => s.score - a.score);
}
function I(e, t) {
  for (let n = 0, o = e.length; n < o; n++) {
    const r = e[n].matcher(t);
    if (r) return r;
  }
  return [];
}
function it(e, t, n) {
  const o = new URL(G), r = createMemo((d) => {
    const w = e();
    try {
      return new URL(w[0] === "/" ? G + w : w, o);
    } catch {
      return console.error(`Invalid path ${w}`), d;
    }
  }, o, { equals: (d, w) => d.href === w.href }), a = createMemo(() => r().pathname), s = createMemo(() => r().search, true), i = createMemo(() => r().hash), c = () => "", l = on(s, () => ge(r()));
  return { get pathname() {
    return a();
  }, get search() {
    return s();
  }, get hash() {
    return i();
  }, get state() {
    return t();
  }, get key() {
    return c();
  }, query: n ? n(l) : we(l) };
}
let L;
function ct() {
  return L;
}
function lt(e, t, n, o = {}) {
  const { signal: [r, a], utils: s = {} } = e, i = s.parsePath || ((h) => h), c = s.renderPath || ((h) => h), l = s.beforeLeave || pe(), d = K("", o.base || "");
  if (d === void 0) throw new Error(`${d} is not a valid base path`);
  d && !r().value && a({ value: d, replace: true, scroll: false });
  const [w, m] = createSignal(false);
  let p;
  const b = (h, g) => {
    g.value === u() && g.state === v() || (p === void 0 && m(true), L = h, p = g, startTransition(() => {
      p === g && (f(p.value), y(p.state), resetErrorBoundaries(), isServer || C[1]((P) => P.filter((x) => x.pending)));
    }).finally(() => {
      p === g && batch(() => {
        L = void 0, h === "navigate" && Ce(p), m(false), p = void 0;
      });
    }));
  }, [u, f] = createSignal(r().value), [v, y] = createSignal(r().state), A = it(u, v, s.queryWrapper), E = [], C = createSignal(isServer ? Oe() : []), N = createMemo(() => typeof o.transformUrl == "function" ? I(t(), o.transformUrl(A.pathname)) : I(t(), A.pathname)), Z = () => {
    const h = N(), g = {};
    for (let P = 0; P < h.length; P++) Object.assign(g, h[P].params);
    return g;
  }, Ee = s.paramsWrapper ? s.paramsWrapper(Z, t) : we(Z), ee = { pattern: d, path: () => d, outlet: () => null, resolvePath(h) {
    return K(d, h);
  } };
  return createRenderEffect(on(r, (h) => b("native", h), { defer: true })), { base: ee, location: A, params: Ee, isRouting: w, get pendingTarget() {
    return p;
  }, renderPath: c, parsePath: i, navigatorFactory: Ae, matches: N, beforeLeave: l, preloadRoute: Le, singleFlight: o.singleFlight === void 0 ? true : o.singleFlight, submissions: C };
  function Se(h, g, P) {
    untrack(() => {
      if (typeof g == "number") {
        g && (s.go ? s.go(g) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const x = !g || g[0] === "?", { replace: q, resolve: T, scroll: B, state: U } = { replace: false, resolve: !x, scroll: true, ...P }, j = T ? h.resolvePath(g) : K(x && A.pathname || "", g);
      if (j === void 0) throw new Error(`Path '${g}' is not a routable path`);
      if (E.length >= nt) throw new Error("Too many redirects");
      const te = u();
      if (j !== te || U !== v()) if (isServer) {
        const ne = getRequestEvent();
        ne && (ne.response = { status: 302, headers: new Headers({ Location: j }) }), a({ value: j, replace: q, scroll: B, state: U });
      } else l.confirm(j, P) && (E.push({ value: te, replace: q, scroll: B, state: v() }), b("navigate", { value: j, state: U }));
    });
  }
  function Ae(h) {
    return h = h || useContext(ve) || ee, (g, P) => Se(h, g, P);
  }
  function Ce(h) {
    const g = E[0];
    g && (a({ ...h, replace: g.replace, scroll: g.scroll }), E.length = 0);
  }
  function Le(h, g) {
    const P = I(t(), h.pathname), x = L;
    L = "preload";
    for (let q in P) {
      const { route: T, params: B } = P[q];
      T.component && T.component.preload && T.component.preload();
      const { preload: U } = T;
      g && U && runWithOwner(n(), () => U({ params: B, location: { pathname: h.pathname, search: h.search, hash: h.hash, query: ge(h), state: null, key: "" }, intent: "preload" }));
    }
    L = x;
  }
  function Oe() {
    const h = getRequestEvent();
    return h && h.router && h.router.submission ? [h.router.submission] : [];
  }
}
function ut(e, t, n, o) {
  const { base: r, location: a, params: s } = e, { pattern: i, component: c, preload: l } = o().route, d = createMemo(() => o().path);
  c && c.preload && c.preload();
  const w = l ? l({ params: s, location: a, intent: L || "initial" }) : void 0;
  return { parent: t, pattern: i, path: d, outlet: () => c ? createComponent$1(c, { params: s, location: a, data: w, get children() {
    return n();
  } }) : n(), resolvePath(p) {
    return K(r.path(), p, d());
  } };
}
const Re = (e) => (t) => {
  const { base: n } = t, o = children(() => t.children), r = createMemo(() => Pe(o(), t.base || ""));
  let a;
  const s = lt(e, r, () => a, { base: n, singleFlight: t.singleFlight, transformUrl: t.transformUrl });
  return e.create && e.create(s), createComponent(rt.Provider, { value: s, get children() {
    return createComponent(dt, { routerState: s, get root() {
      return t.root;
    }, get preload() {
      return t.rootPreload || t.rootLoad;
    }, get children() {
      return [(a = getOwner()) && null, createComponent(ft, { routerState: s, get branches() {
        return r();
      } })];
    } });
  } });
};
function dt(e) {
  const t = e.routerState.location, n = e.routerState.params, o = createMemo(() => e.preload && untrack(() => {
    e.preload({ params: n, location: t, intent: ct() || "initial" });
  }));
  return createComponent(Show, { get when() {
    return e.root;
  }, keyed: true, get fallback() {
    return e.children;
  }, children: (r) => createComponent(r, { params: n, location: t, get data() {
    return o();
  }, get children() {
    return e.children;
  } }) });
}
function ft(e) {
  if (isServer) {
    const r = getRequestEvent();
    if (r && r.router && r.router.dataOnly) {
      ht(r, e.routerState, e.branches);
      return;
    }
    r && ((r.router || (r.router = {})).matches || (r.router.matches = e.routerState.matches().map(({ route: a, path: s, params: i }) => ({ path: a.originalPath, pattern: a.pattern, match: s, params: i, info: a.info }))));
  }
  const t = [];
  let n;
  onCleanup(() => t.forEach((r) => r()));
  const o = createMemo(on(e.routerState.matches, (r, a, s) => {
    let i = a && r.length === a.length;
    const c = [];
    for (let l = 0, d = r.length; l < d; l++) {
      const w = a && a[l], m = r[l];
      s && w && m.route.key === w.route.key ? c[l] = s[l] : (i = false, t[l] && t[l](), createRoot((p) => {
        t[l] = p, c[l] = ut(e.routerState, c[l - 1] || e.routerState.base, ae(() => o()[l + 1]), () => {
          var _a;
          const b = e.routerState.matches();
          return (_a = b[l]) != null ? _a : b[0];
        });
      }));
    }
    return t.splice(r.length).forEach((l) => l()), s && i ? s : (n = c[0], c);
  }));
  return ae(() => o() && n)();
}
const ae = (e) => () => createComponent(Show, { get when() {
  return e();
}, keyed: true, children: (t) => createComponent(ve.Provider, { value: t, get children() {
  return t.outlet();
} }) });
function ht(e, t, n) {
  const o = new URL(e.request.url), r = I(n, new URL(e.router.previousUrl || e.request.url).pathname), a = I(n, o.pathname);
  for (let s = 0; s < a.length; s++) {
    (!r[s] || a[s].route !== r[s].route) && (e.router.dataOnly = true);
    const { route: i, params: c } = a[s];
    i.preload && i.preload({ params: c, location: t.location, intent: "preload" });
  }
}
function mt([e, t], n, o) {
  return [e, o ? (r) => t(o(r)) : t];
}
function pt(e) {
  let t = false;
  const n = (r) => typeof r == "string" ? { value: r } : r, o = mt(createSignal(n(e.get()), { equals: (r, a) => r.value === a.value && r.state === a.state }), void 0, (r) => (!t && e.set(r), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = true), r));
  return e.init && onCleanup(e.init((r = e.get()) => {
    t = true, o[1](n(r)), t = false;
  })), Re({ signal: o, create: e.create, utils: e.utils });
}
function X(e, t, n) {
  return e.addEventListener(t, n), () => e.removeEventListener(t, n);
}
function gt(e, t) {
  const n = e && document.getElementById(e);
  n ? n.scrollIntoView() : t && window.scrollTo(0, 0);
}
function wt(e) {
  const t = new URL(e);
  return t.pathname + t.search;
}
function yt(e) {
  let t;
  const n = { value: e.url || (t = getRequestEvent()) && wt(t.request.url) || "" };
  return Re({ signal: [() => n, (o) => Object.assign(n, o)] })(e);
}
const vt = /* @__PURE__ */ new Map();
function bt({ preload: e = true, explicitLinks: t = false, actionBase: n = "/_server", transformUrl: o } = {}) {
  return (r) => {
    const a = r.base.path(), s = r.navigatorFactory(r.base);
    let i, c;
    function l(u) {
      return u.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function d(u) {
      if (u.defaultPrevented || u.button !== 0 || u.metaKey || u.altKey || u.ctrlKey || u.shiftKey) return;
      const f = u.composedPath().find((N) => N instanceof Node && N.nodeName.toUpperCase() === "A");
      if (!f || t && !f.hasAttribute("link")) return;
      const v = l(f), y = v ? f.href.baseVal : f.href;
      if ((v ? f.target.baseVal : f.target) || !y && !f.hasAttribute("state")) return;
      const E = (f.getAttribute("rel") || "").split(/\s+/);
      if (f.hasAttribute("download") || E && E.includes("external")) return;
      const C = v ? new URL(y, document.baseURI) : new URL(y);
      if (!(C.origin !== window.location.origin || a && C.pathname && !C.pathname.toLowerCase().startsWith(a.toLowerCase()))) return [f, C];
    }
    function w(u) {
      const f = d(u);
      if (!f) return;
      const [v, y] = f, A = r.parsePath(y.pathname + y.search + y.hash), E = v.getAttribute("state");
      u.preventDefault(), s(A, { resolve: false, replace: v.hasAttribute("replace"), scroll: !v.hasAttribute("noscroll"), state: E ? JSON.parse(E) : void 0 });
    }
    function m(u) {
      const f = d(u);
      if (!f) return;
      const [v, y] = f;
      o && (y.pathname = o(y.pathname)), r.preloadRoute(y, v.getAttribute("preload") !== "false");
    }
    function p(u) {
      clearTimeout(i);
      const f = d(u);
      if (!f) return c = null;
      const [v, y] = f;
      c !== v && (o && (y.pathname = o(y.pathname)), i = setTimeout(() => {
        r.preloadRoute(y, v.getAttribute("preload") !== "false"), c = v;
      }, 20));
    }
    function b(u) {
      if (u.defaultPrevented) return;
      let f = u.submitter && u.submitter.hasAttribute("formaction") ? u.submitter.getAttribute("formaction") : u.target.getAttribute("action");
      if (!f) return;
      if (!f.startsWith("https://action/")) {
        const y = new URL(f, G);
        if (f = r.parsePath(y.pathname + y.search), !f.startsWith(n)) return;
      }
      if (u.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const v = vt.get(f);
      if (v) {
        u.preventDefault();
        const y = new FormData(u.target, u.submitter);
        v.call({ r, f: u.target }, u.target.enctype === "multipart/form-data" ? y : new URLSearchParams(y));
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", w), e && (document.addEventListener("mousemove", p, { passive: true }), document.addEventListener("focusin", m, { passive: true }), document.addEventListener("touchstart", m, { passive: true })), document.addEventListener("submit", b), onCleanup(() => {
      document.removeEventListener("click", w), e && (document.removeEventListener("mousemove", p), document.removeEventListener("focusin", m), document.removeEventListener("touchstart", m)), document.removeEventListener("submit", b);
    });
  };
}
const se = "solid-router:scroll";
function Pt() {
  window.history.scrollRestoration = "manual", J();
  let e = {};
  try {
    e = JSON.parse(sessionStorage.getItem(se)) || {};
  } catch {
  }
  const t = () => window.history.state && window.history.state._depth;
  let n = false, o;
  const r = [X(window, "scroll", () => {
    const s = t();
    s != null && (e[s] = window.scrollY), n || (o = void 0);
  }), X(window, "pagehide", () => {
    try {
      sessionStorage.setItem(se, JSON.stringify(e));
    } catch {
    }
  })], a = () => {
    if (o == null) return;
    const s = e[o];
    o = void 0, s != null && (n = true, window.scrollTo(0, s), n = false);
  };
  return { onPop() {
    o = t();
  }, onPush() {
    const s = t();
    if (s != null) for (const i in e) +i >= s && delete e[i];
  }, create(s) {
    createEffect(on(s.isRouting, (c) => c || a(), { defer: true })), onCleanup(() => r.forEach((c) => c()));
    const [i] = performance.getEntriesByType && performance.getEntriesByType("navigation");
    i && i.type !== "navigate" && (o = t(), a());
  } };
}
function Rt(e) {
  if (isServer) return yt(e);
  const t = e.scrollRestoration ? Pt() : void 0, n = () => {
    const r = window.location.pathname + window.location.search, a = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return { value: r + window.location.hash, state: a };
  }, o = pe();
  return pt({ get: n, set({ value: r, replace: a, scroll: s, state: i }) {
    a ? window.history.replaceState(Ye(i), "", r) : window.history.pushState(i, "", r), gt(decodeURIComponent(window.location.hash.slice(1)), s), J(), t && !a && t.onPush();
  }, init: (r) => {
    const a = Ge(r, (s) => {
      if (s) return !o.confirm(s);
      {
        const i = n();
        return !o.confirm(i.value, { state: i.state });
      }
    });
    return X(window, "popstate", t ? () => {
      t.onPop(), a();
    } : a);
  }, create: (r) => {
    bt({ preload: e.preload, explicitLinks: e.explicitLinks, actionBase: e.actionBase, transformUrl: e.transformUrl })(r), t && t.create(r);
  }, utils: { go: (r) => window.history.go(r), beforeLeave: o } })(e);
}
function $t() {
  return createComponent(Rt, { root: (e) => createComponent(De, { get children() {
    return [createComponent(ze, { children: "Ecommerce Admin" }), createComponent(Suspense, { get children() {
      return e.children;
    } })];
  } }), get children() {
    return createComponent(Ft, {});
  } });
}

export { $t as default };
//# sourceMappingURL=app-DJBcvgaF.mjs.map
