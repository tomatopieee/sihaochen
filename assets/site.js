/* Sihao Chen site: shared header, cart, checkout and page renderers.
   Prices live in assets/catalog.json (the checkout server reads the same file). */

/* ===== CONFIG ===== */
// Checkout server (Cloudflare Worker). Empty = checkout shows "opening soon".
const CHECKOUT_URL = "https://sihaochen-checkout.sihaochen599.workers.dev";
const IG = "https://www.instagram.com/ci278ci/";
const DM = "https://ig.me/m/ci278ci";
const EMAIL = "sihaochen599@gmail.com";

const ROOT = document.body.dataset.root || "./";
const PAGE = document.body.dataset.page || "";
const CART_KEY = "sc_cart_v1";

/* ===== SHOP DISPLAY (what each card shows; prices come from catalog) ===== */
const SHOP = [
  {
    id: "mf", title: "Middle Finger Mini Stamp Kit", tag: "Stamp kit",
    img: "img/finger-stamp.jpg", alt: "Hand-carved middle finger mini stamp with a red print on a kraft sticker",
    specs: ["1 original hand-carved stamp, about 3 × 3 cm", "1 mini ink pad (random color)", "5 blank sticker sheets", "Designed & carved by me"],
    variants: [{ label: "Kit", sku: "mf-kit" }]
  },
  {
    id: "ah", title: "AHHHHH Stamp Kit", tag: "Stamp kit",
    img: "img/bean-stamp.jpg", alt: "Hand-carved screaming face stamp next to its teal print",
    specs: ["1 original hand-carved stamp, about 5 cm tall", "1 mini ink pad (random color)", "5 blank sticker sheets", "Designed & carved by me"],
    variants: [{ label: "Kit", sku: "ahhhhh" }]
  },
  {
    id: "snake", title: "Snake Postcard", tag: "Postcard",
    img: "img/snake-postcards.jpg", alt: "Eight hand-printed snake postcards, white lines on black",
    desc: "A coiled snake carved in fine white lines on black. Printed by hand, one at a time.",
    specs: ["Hand-printed linocut"],
    variants: [{ label: "Single", sku: "snake-pc" }]
  },
  {
    id: "giant", title: "Giant Postcards", tag: "Postcard",
    img: "img/giants-prints.jpg", alt: "Hand-printed giant face postcards laid out in rows",
    desc: "Five giant faces, each carved and printed by hand. Square format.",
    specs: ["Hand-printed linocut", "Square postcards need a $1.27 stamp to mail in the US"],
    designImgs: { "No.1": "", "No.2": "", "No.3": "", "No.4": "", "No.5": "" },
    variants: [{ label: "Single", sku: "giant-pc" }, { label: "All five", sku: "giant-set" }]
  },
  {
    id: "gnome", title: "Gnome Bookmark", tag: "Bookmark",
    img: "img/gnome-bookmarks.jpg", alt: "Three hand-printed gnome bookmarks in red, red and green, and green, with twine ties",
    desc: "A grumpy little gnome printed from two carved blocks on flecked paper, tied with twine.",
    specs: ["Two-block linocut, about 5 × 15 cm", "Signed with name and logo stamp on the back"],
    variants: [
      { label: "Red", sku: "gnome-single", fixed: { color: "Red" } },
      { label: "Green", sku: "gnome-single", fixed: { color: "Green" } },
      { label: "Red & green", sku: "gnome-rg" },
      { label: "Set of three", sku: "gnome-set" }
    ]
  }
];
const BLIND = [
  { sku: "bb-sticker", title: "Sticker Print", note: "Hand-printed sticker" },
  { sku: "bb-mini", title: "Mini Print", note: "Hand-printed mini print" }
];
const OPTION_LABEL = { version: "Version", design: "Design", color: "Color" };

/* ===== HELPERS ===== */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = n => "$" + (Number.isInteger(n) ? String(n) : n.toFixed(2));
const imgTag = (src, alt, cls = "") => src
  ? `<img src="${esc(ROOT + src)}" alt="${esc(alt)}" loading="lazy"${cls ? ` class="${cls}"` : ""}>`
  : `<div class="ph-box${cls ? " " + cls : ""}">Photo coming</div>`;

let CAT = null;
async function loadCatalog() {
  if (CAT) return CAT;
  const r = await fetch(ROOT + "assets/catalog.json", { cache: "no-cache" });
  CAT = await r.json();
  return CAT;
}
function saleState(now = new Date()) {
  if (!CAT?.sale) return "none";
  const s = new Date(CAT.sale.start), e = new Date(CAT.sale.end);
  return now < s ? "before" : now <= e ? "on" : "after";
}
function unitPrice(sku) {
  const it = CAT.items[sku] || uniqueItem(sku);
  if (!it) return 0;
  return it.sale && saleState() === "on" ? Math.round(it.price * (1 - CAT.sale.off) * 100) / 100 : it.price;
}
function priceHTML(sku) {
  const it = CAT.items[sku] || uniqueItem(sku);
  if (!it) return "";
  const now = unitPrice(sku);
  return `<span class="price">${now !== it.price ? `<s>${money(it.price)}</s>` : ""}<span class="now">${money(now)}</span></span>`;
}
function uniqueItem(sku) {
  for (const s of CAT?.etchings || []) for (const p of s.prints || []) if (p.sku === sku) return { name: `${s.title}, ${p.title || p.sku}`, price: p.price, sale: false, kind: "unique", img: p.img };
  return null;
}

/* ===== CART ===== */
function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (_) { return []; } }
function writeCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (_) {} renderCartCount(); renderDrawer(); }
const lineKey = (sku, opts) => sku + "|" + JSON.stringify(opts || {});
function addToCart(sku, opts = {}, qty = 1) {
  const c = readCart(), key = lineKey(sku, opts);
  const kind = (CAT.items[sku] || uniqueItem(sku))?.kind;
  const ex = c.find(l => lineKey(l.sku, l.opts) === key);
  if (ex) ex.qty = kind === "unique" ? 1 : Math.min(10, ex.qty + qty);
  else c.push({ sku, opts, qty: kind === "unique" ? 1 : qty });
  writeCart(c);
  toast("Added to cart");
}
function setQty(i, q) { const c = readCart(); if (!c[i]) return; if (q <= 0) c.splice(i, 1); else c[i].qty = Math.min(10, q); writeCart(c); }
function blindTotals(cart) {
  const n = cart.filter(l => CAT.items[l.sku]?.kind === "blind").reduce((a, l) => a + l.qty, 0);
  const b = CAT.blindBox, bundles = Math.floor(n / b.bundleSize), rest = n % b.bundleSize;
  return { n, total: bundles * b.bundlePrice + rest * b.each, full: n * b.each };
}
function cartTotals(cart = readCart()) {
  let sub = 0, full = 0;
  for (const l of cart) {
    const it = CAT.items[l.sku] || uniqueItem(l.sku);
    if (!it || it.kind === "blind") continue;
    sub += unitPrice(l.sku) * l.qty; full += it.price * l.qty;
  }
  const bb = blindTotals(cart);
  sub += bb.total; full += bb.full;
  return { sub: Math.round(sub * 100) / 100, save: Math.round((full - sub) * 100) / 100, bb };
}

/* ===== CHROME: banner, header, footer, drawer ===== */
function buildChrome() {
  const links = [["index.html", "Work"], ["shop/index.html", "Shop"], ["etchings/index.html", "Etchings"], ["originals/index.html", "Originals"], ["custom/index.html", "Custom"]];
  const nav = links.map(([href, label]) => `<a href="${ROOT}${href}"${PAGE === (label.toLowerCase()) ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  document.body.insertAdjacentHTML("afterbegin", `
    <div class="banner" id="banner" hidden><div class="wrap"><b id="banner-title"></b><span id="banner-time"></span></div></div>
    <header class="site"><div class="wrap bar">
      <a class="logo" href="${ROOT}index.html">SIHAO CHEN</a>
      <nav class="nav" aria-label="Main">${nav}</nav>
      <button class="cart-btn" id="cart-open" type="button" aria-label="Open cart">Cart <span class="count" id="cart-count">0</span></button>
    </div></header>`);
  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site"><div class="wrap"><span>© 2026 Sihao Chen · Hand-carved in the USA</span><span><a href="${IG}" target="_blank" rel="noopener">@ci278ci</a> · ${EMAIL}</span></div></footer>
    <div class="scrim" id="scrim" hidden></div>
    <aside class="drawer" id="drawer" hidden aria-label="Cart">
      <header><h2>Your cart</h2><button class="x" id="cart-close" type="button" aria-label="Close cart">×</button></header>
      <div class="body" id="cart-body"></div>
      <footer id="cart-foot"></footer>
    </aside>`);
  $("#cart-open").addEventListener("click", openDrawer);
  $("#cart-close").addEventListener("click", closeDrawer);
  $("#scrim").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
}
function openDrawer() { renderDrawer(); $("#drawer").hidden = false; $("#scrim").hidden = false; }
function closeDrawer() { $("#drawer").hidden = true; $("#scrim").hidden = true; }
function renderCartCount() { const n = readCart().reduce((a, l) => a + l.qty, 0); const el = $("#cart-count"); if (el) el.textContent = n; }

function lineImg(sku) {
  const s = SHOP.find(p => p.variants.some(v => v.sku === sku));
  if (s) return s.img;
  if (sku === "bb-sticker" || sku === "bb-mini") return "img/blind-box.jpg";
  return uniqueItem(sku)?.img || "";
}
function renderDrawer() {
  const body = $("#cart-body"), foot = $("#cart-foot");
  if (!body || !CAT) return;
  const cart = readCart();
  const lines = cart.map((l, i) => {
    const it = CAT.items[l.sku] || uniqueItem(l.sku);
    if (!it) return "";
    const opts = Object.entries(l.opts || {}).map(([k, v]) => `${OPTION_LABEL[k] || k}: ${v}`).join(" · ");
    const each = it.kind === "blind" ? CAT.blindBox.each : unitPrice(l.sku);
    return `<div class="line">
      ${imgTag(lineImg(l.sku), it.name)}
      <div><b>${esc(it.name)}</b>${opts ? `<small>${esc(opts)}</small>` : ""}
        <small>${it.kind === "unique" ? "One of one" : `<span class="qty" style="border-width:1px;margin-top:4px"><button type="button" data-q="${i}" data-d="-1" aria-label="Less">−</button><output>${l.qty}</output><button type="button" data-q="${i}" data-d="1" aria-label="More">+</button></span>`}
        <button class="rm" type="button" data-rm="${i}">Remove</button></small></div>
      <div class="amt">${it.kind === "blind" ? "" : money(Math.round(each * l.qty * 100) / 100)}</div>
    </div>`;
  }).join("");
  const bb = blindTotals(cart);
  const addon = `<div class="addon">
    <h3>Add a little surprise</h3>
    <p>Handmade blind box: $${CAT.blindBox.each} each, any ${CAT.blindBox.bundleSize} for $${CAT.blindBox.bundlePrice}. Mix stickers and mini prints.${bb.n ? ` You have ${bb.n}: ${money(bb.total)}.` : ""}</p>
    ${BLIND.map(b => `<div class="row"><span><b>${esc(b.title)}</b> <small class="muted">${esc(b.note)}</small></span><button class="btn small ghost" type="button" data-add-blind="${b.sku}">+ Add</button></div>`).join("")}
  </div>`;
  body.innerHTML = (cart.length ? lines : `<p class="empty">Your cart is empty.</p>`) + addon;
  const t = cartTotals(cart);
  const ready = !!CHECKOUT_URL;
  foot.innerHTML = cart.length ? `
    ${t.save > 0 ? `<div class="sum save"><span>You save</span><span>−${money(t.save)}</span></div>` : ""}
    <div class="sum total"><span>Total</span><span>${money(t.sub)}</span></div>
    <div class="sum"><span>Shipping (US)</span><span>Free</span></div>
    <button class="btn" id="checkout" type="button"${ready ? "" : " disabled"}>${ready ? "Checkout" : "Checkout opens soon"}</button>
    <p class="hint" id="checkout-msg"></p>` : "";
  body.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { const i = +b.dataset.q; setQty(i, readCart()[i].qty + +b.dataset.d); }));
  body.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => setQty(+b.dataset.rm, 0)));
  body.querySelectorAll("[data-add-blind]").forEach(b => b.addEventListener("click", () => addToCart(b.dataset.addBlind)));
  $("#checkout")?.addEventListener("click", checkout);
}
async function checkout() {
  const btn = $("#checkout"), msg = $("#checkout-msg");
  btn.disabled = true; btn.textContent = "Opening checkout…"; msg.textContent = "";
  try {
    const r = await fetch(CHECKOUT_URL.replace(/\/$/, "") + "/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: readCart(), returnUrl: location.origin + location.pathname })
    });
    const d = await r.json();
    if (!r.ok || !d.url) throw new Error(d.error || "Checkout could not start.");
    location.href = d.url;
  } catch (e) {
    msg.textContent = e.message + " Please try again, or DM @ci278ci.";
    btn.disabled = false; btn.textContent = "Checkout";
  }
}
let toastTimer;
function toast(t) {
  let el = $("#toast");
  if (!el) { document.body.insertAdjacentHTML("beforeend", `<div class="toast" id="toast" role="status"></div>`); el = $("#toast"); }
  el.textContent = t; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 1800);
}

/* ===== SALE BANNER ===== */
function tickBanner() {
  const st = saleState(), b = $("#banner");
  if (!b) return false;
  if (st === "none" || st === "after") { b.hidden = true; return false; }
  b.hidden = false;
  const target = new Date(st === "before" ? CAT.sale.start : CAT.sale.end);
  let s = Math.max(0, Math.floor((target - new Date()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
  const t = `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  $("#banner-title").textContent = `${CAT.sale.label} · ${Math.round(CAT.sale.off * 100)}% off all products`;
  $("#banner-time").textContent = st === "before" ? `Starts Nov 11 · in ${t}` : `Ends Dec 11 · ${t} left`;
  return true;
}

/* ===== SHOP PAGE ===== */
function renderShop() {
  const host = $("#products"); if (!host) return;
  host.innerHTML = SHOP.map(p => `
    <article class="card" data-card="${p.id}">
      <div class="ph">${imgTag(p.img, p.alt)}<span class="tag">${esc(p.tag)}</span></div>
      <h3>${esc(p.title)}</h3>
      ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
      <ul class="specs">${p.specs.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      <div class="foot" data-foot></div>
    </article>`).join("");
  SHOP.forEach(p => setupCard(p, host.querySelector(`[data-card="${p.id}"] [data-foot]`)));
  renderBlindStrip();
}
function setupCard(p, foot) {
  const state = { v: 0, opts: {}, qty: 1 };
  function draw() {
    const v = p.variants[state.v], it = CAT.items[v.sku];
    const optKeys = Object.keys(it.options || {}).filter(k => !(v.fixed && k in v.fixed));
    let html = "";
    if (p.variants.length > 1) html += `<div class="pick"><span>Choose</span><div class="chips">${p.variants.map((x, i) =>
      `<button type="button" class="chip" data-v="${i}" aria-pressed="${i === state.v}">${esc(x.label)}<span class="p">${money(unitPrice(x.sku))}</span></button>`).join("")}</div></div>`;
    for (const k of optKeys) {
      const vals = it.options[k];
      if (k === "design") {
        html += `<div class="pick"><span>${OPTION_LABEL[k]}: <b>${esc(state.opts[k] || "pick one")}</b></span><div class="thumbs">${vals.map(val =>
          `<button type="button" class="thumb" data-o="${k}" data-val="${esc(val)}" aria-pressed="${state.opts[k] === val}">${p.designImgs?.[val] ? `<img src="${esc(ROOT + p.designImgs[val])}" alt="${esc(val)}">` : `<div class="ph-box">${esc(val)}</div>`}<small>${esc(val)}</small></button>`).join("")}</div></div>`;
      } else {
        html += `<div class="pick"><span>${OPTION_LABEL[k] || k}: <b>${esc(state.opts[k] || "pick one")}</b></span><div class="chips">${vals.map(val =>
          `<button type="button" class="chip" data-o="${k}" data-val="${esc(val)}" aria-pressed="${state.opts[k] === val}">${esc(val)}</button>`).join("")}</div></div>`;
      }
    }
    html += `<div class="buyrow">${priceHTML(v.sku)}
      <span class="qty"><button type="button" data-qd="-1" aria-label="Less">−</button><output>${state.qty}</output><button type="button" data-qd="1" aria-label="More">+</button></span></div>
      <button class="btn" type="button" data-add>Add to cart</button><p class="hint" data-hint></p>`;
    foot.innerHTML = html;
    foot.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => { state.v = +b.dataset.v; draw(); }));
    foot.querySelectorAll("[data-o]").forEach(b => b.addEventListener("click", () => { state.opts[b.dataset.o] = b.dataset.val; draw(); }));
    foot.querySelectorAll("[data-qd]").forEach(b => b.addEventListener("click", () => { state.qty = Math.max(1, Math.min(10, state.qty + +b.dataset.qd)); draw(); }));
    foot.querySelector("[data-add]").addEventListener("click", () => {
      const missing = optKeys.filter(k => !state.opts[k]);
      if (missing.length) { foot.querySelector("[data-hint]").textContent = "Please choose " + missing.map(k => (OPTION_LABEL[k] || k).toLowerCase()).join(" and ") + " first."; return; }
      const opts = { ...(v.fixed || {}) }; optKeys.forEach(k => opts[k] = state.opts[k]);
      addToCart(v.sku, opts, state.qty);
    });
  }
  draw();
}
function renderBlindStrip() {
  const host = $("#blind"); if (!host) return;
  const b = CAT.blindBox;
  host.innerHTML = `<div class="blind">
    <img src="${ROOT}img/blind-box.jpg" alt="Small red hand-printed mini prints spread on a desk" loading="lazy">
    <div><p class="label">Handmade blind box</p><h3>A little surprise</h3>
      <p class="muted" style="margin:0">Every one is printed by hand and you won't know which design you get. $${b.each} each, or any ${b.bundleSize} for $${b.bundlePrice}. Mix and match.</p>
      <div class="rows">${BLIND.map(x => `<div class="row"><span><b>${esc(x.title)}</b> <span class="muted">· ${money(b.each)}</span></span><button class="btn small" type="button" data-blind="${x.sku}">Add to cart</button></div>`).join("")}</div>
    </div></div>`;
  host.querySelectorAll("[data-blind]").forEach(btn => btn.addEventListener("click", () => addToCart(btn.dataset.blind)));
}

/* ===== ETCHINGS PAGE ===== */
let SOLD = new Set();
async function loadSold() {
  if (!CHECKOUT_URL) return;
  try { const r = await fetch(CHECKOUT_URL.replace(/\/$/, "") + "/sold"); const d = await r.json(); SOLD = new Set(d.sold || []); } catch (_) {}
}
function renderEtchings() {
  const host = $("#etchings"); if (!host) return;
  const id = location.hash.slice(1), s = CAT.etchings.find(x => x.id === id);
  if (!s) {
    host.innerHTML = `<div class="sec-head"><h1>Etchings</h1><p>Every impression is inked, wiped and printed by hand, so no two are the same. Pick a design to see each print.</p></div>
      <div class="series">${CAT.etchings.map(x => `<a class="cat" href="#${esc(x.id)}">${imgTag(x.prints?.[0]?.img || x.cover || "", x.title, "pic")}<h3>${esc(x.title)}</h3><p>${x.prints.length ? `${x.prints.length} prints · from ${money(Math.min(...x.prints.map(p => p.price)))}` : "Scans coming soon"}</p></a>`).join("")}</div>`;
    return;
  }
  host.innerHTML = `<a class="back" href="#">← All etchings</a>
    <div class="sec-head"><h1>${esc(s.title)}</h1><p>${esc(s.blurb)}</p></div>
    ${s.prints.length ? `<div class="prints">${s.prints.map(p => {
      const sold = SOLD.has(p.sku) || p.sold;
      return `<div class="print${sold ? " sold" : ""}">${imgTag(p.img, `${s.title}, ${p.title || p.sku}`, "pic")}
        <div class="row"><b>${esc(p.title || p.sku)}</b>${sold ? `<span class="sold-tag">Sold</span>` : `<span class="price"><span class="now">${money(p.price)}</span></span>`}</div>
        ${sold ? "" : `<button class="btn small" type="button" data-etch="${esc(p.sku)}">Add to cart</button>`}</div>`;
    }).join("")}</div>` : `<p class="muted">Scans of each print are coming soon.</p>`}
    <p class="note-line">One of one. Each print is unique and ships flat in a rigid envelope. Not part of the sale.</p>`;
  host.querySelectorAll("[data-etch]").forEach(b => b.addEventListener("click", () => addToCart(b.dataset.etch)));
}

/* ===== ORIGINALS PAGE ===== */
function renderOriginals() {
  const host = $("#originals"); if (!host) return;
  host.innerHTML = CAT.originals.map(o => `<div class="piece">
    ${imgTag(o.img, o.title, "pic")}
    <h3>${esc(o.title)}</h3>
    <div class="meta">${esc(o.medium)}${o.size ? " · " + esc(o.size) : ""} · One of one</div>
    ${o.price ? `<span class="price"><span class="now">${money(o.price)}</span></span>` : `<span class="muted">Price coming soon</span>`}
    <div class="cta-row"><a class="btn small" href="${DM}" target="_blank" rel="noopener">Inquire on Instagram</a></div>
  </div>`).join("");
}

/* ===== COPY EMAIL ===== */
function wireCopy() {
  const btn = $("#copy"), el = $("#email"); if (!btn || !el) return;
  btn.addEventListener("click", () => {
    const sel = () => getSelection().selectAllChildren(el);
    try { navigator.clipboard.writeText(el.textContent).then(() => { btn.textContent = "Copied"; setTimeout(() => btn.textContent = "Copy email", 1600); }, sel); } catch (_) { sel(); }
  });
}

/* ===== BOOT ===== */
(async function boot() {
  buildChrome();
  wireCopy();
  try { await loadCatalog(); } catch (e) { console.error("catalog", e); return; }
  if (new URLSearchParams(location.search).get("paid") === "1") { writeCart([]); toast("Thank you! Your order is in."); history.replaceState(null, "", location.pathname); }
  renderCartCount();
  if (PAGE === "shop") renderShop();
  if (PAGE === "etchings") { await loadSold(); renderEtchings(); addEventListener("hashchange", () => { renderEtchings(); scrollTo(0, 0); }); }
  if (PAGE === "originals") renderOriginals();
  let wasSale = saleState();
  if (tickBanner()) {
    const t = setInterval(() => {
      if (!tickBanner()) clearInterval(t);
      const s = saleState(); if (s !== wasSale) { wasSale = s; if (PAGE === "shop") renderShop(); renderDrawer(); }
    }, 1000);
  }
})();
