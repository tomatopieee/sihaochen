/* Sihao Chen site: shared header, cart, checkout and page renderers.
   Prices live in assets/catalog.json (the checkout server reads the same file). */

/* ===== CONFIG ===== */
// Checkout server (Cloudflare Worker). Empty = checkout shows "opening soon".
const CHECKOUT_URL = "https://sihaochen-checkout.sihaochen599.workers.dev";
const IG = "https://www.instagram.com/ci278ci/";
const DM = "https://ig.me/m/ci278ci";
const EMAIL = "sihaochenart@gmail.com";

const ROOT = document.body.dataset.root || "./";
const PAGE = document.body.dataset.page || "";
const CART_KEY = "sc_cart_v1";

/* ===== SHOP DISPLAY (what each card shows; prices come from catalog) ===== */
// Photo of each postcard back, shown when the customer picks a version.
const VERSION_IMGS = { "Signed Print": "img/signed-backs.jpg", "Postcard": "" };
const SHOP = [
  {
    id: "mf", section: "linocut", title: "Middle Finger Mini Stamp Kit", tag: "Stamp kit",
    img: "img/finger-stamp.jpg", alt: "Hand-carved middle finger mini stamp with a red print on a kraft sticker",
    specs: ["1 original hand-carved stamp, about 1.2 × 1.2 in (3 × 3 cm)", "1 mini ink pad (random color)", "5 blank sticker sheets", "Designed & carved by me"],
    variants: [{ label: "Kit", sku: "mf-kit" }]
  },
  {
    id: "ah", section: "linocut", title: "AHHHHH Stamp Kit", tag: "Stamp kit",
    img: "img/bean-stamp.jpg", alt: "Hand-carved screaming face stamp next to its teal print",
    specs: ["1 original hand-carved stamp, about 2 in (5 cm) tall", "1 mini ink pad (random color)", "5 blank sticker sheets", "Designed & carved by me"],
    variants: [{ label: "Kit", sku: "ahhhhh" }]
  },
  {
    id: "snake", section: "linocut", title: "Snake Postcard", tag: "Postcard",
    img: "img/snake-postcards.jpg", alt: "Eight hand-printed snake postcards, white lines on black",
    desc: "A coiled snake carved in fine white lines on black. Printed by hand, one at a time.",
    specs: ["Hand-pulled linocut, printed one at a time by hand", "Each print varies slightly", "Cardstock with shimmering gold flecks", "About 4 × 6 in (10 × 15 cm), standard postcard size"],
    variants: [{ label: "Single", sku: "snake-pc" }]
  },
  {
    id: "giant", section: "linocut", title: "Giant Postcards", tag: "Postcard",
    img: "img/giants-prints.jpg", alt: "Hand-printed giant face postcards laid out in rows",
    desc: "Five giant faces, each carved and printed by hand.",
    specs: ["Hand-pulled linocut, printed one at a time by hand", "Each print varies slightly", "Cardstock with shimmering gold flecks", "About 4 × 4.5 in (10 × 11.5 cm)", "Mail it in an envelope to keep the print safe"],
    designImgs: { "No.1": "", "No.2": "", "No.3": "", "No.4": "", "No.5": "" },
    variants: [{ label: "Single", sku: "giant-pc" }, { label: "All five", sku: "giant-set" }]
  },
  {
    id: "gnome", section: "linocut", title: "Gnome Bookmark", tag: "Bookmark",
    img: "img/gnome-bookmarks.jpg", alt: "Three hand-printed gnome bookmarks in red, red and green, and green, with twine ties",
    desc: "A grumpy little gnome printed from two carved blocks on flecked paper, tied with twine.",
    specs: ["Hand-pulled two-block linocut, printed one at a time by hand", "Each print varies slightly", "Cardstock with shimmering gold flecks", "About 2 × 6 in (5 × 15 cm), twine tie", "Signed with name and logo stamp on the back"],
    variants: [
      { label: "Red", sku: "gnome-single", fixed: { color: "Red" } },
      { label: "Green", sku: "gnome-single", fixed: { color: "Green" } },
      { label: "Red & green (the middle one)", sku: "gnome-rg" },
      { label: "Set of three", sku: "gnome-set" }
    ]
  }
];
const BLIND = [
  { sku: "bb-sticker", title: "Mystery Sticker", note: "Hand-printed sticker" },
  { sku: "bb-mini", title: "Mystery Mini Print", note: "Hand-printed mini print" }
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
// Owner preview: add ?preview=sale to any page to see the sale look (display only;
// checkout still charges real prices). ?preview=off turns it off. Lasts for the browser tab.
const PREVIEW_SALE = (() => {
  try {
    const q = new URLSearchParams(location.search).get("preview");
    if (q === "sale") sessionStorage.setItem("sc_preview", "sale");
    if (q === "off") sessionStorage.removeItem("sc_preview");
    return sessionStorage.getItem("sc_preview") === "sale";
  } catch (_) { return false; }
})();
function saleState(now = new Date()) {
  if (!CAT?.sale) return "none";
  if (PREVIEW_SALE) return "on";
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
  const now = unitPrice(sku), base = it.compareAt || it.price;
  const save = Math.round((base - now) * 100) / 100;
  return `<span class="price">${now < base ? `<s>${money(base)}</s>` : ""}<span class="now">${money(now)}</span>${it.compareAt && save > 0 ? `<span class="save-tag">Save ${money(save)}</span>` : ""}</span>`;
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
    sub += unitPrice(l.sku) * l.qty; full += (it.compareAt || it.price) * l.qty;
  }
  // Blind box deal is shown inside its own block, not in "You save".
  const bb = blindTotals(cart);
  sub += bb.total; full += bb.total;
  sub = Math.round(sub * 100) / 100;
  const sh = CAT.shipping || { freeOver: 0, flat: 0 };
  const ship = sub > 0 && sub < sh.freeOver ? sh.flat : 0;
  return { sub, ship, toFree: Math.round((sh.freeOver - sub) * 100) / 100, save: Math.round((full - sub) * 100) / 100, bb };
}

/* ===== CHROME: banner, header, footer, drawer ===== */
function buildChrome() {
  const links = [["index.html", "Portfolio", ["portfolio"]], ["shop/index.html", "Shop", ["shop", "etchings"]], ["custom/index.html", "Custom", ["custom"]]];
  const nav = links.map(([href, label, pages]) => `<a href="${ROOT}${href}"${pages.includes(PAGE) ? ' aria-current="page"' : ""}>${label}</a>`).join("");
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
  const qtyCtl = (i, q) => `<span class="qty" style="border-width:1px;margin-top:4px"><button type="button" data-q="${i}" data-d="-1" aria-label="Less">−</button><output>${q}</output><button type="button" data-q="${i}" data-d="1" aria-label="More">+</button></span>`;
  const lines = cart.map((l, i) => {
    const it = CAT.items[l.sku] || uniqueItem(l.sku);
    if (!it || it.kind === "blind") return "";
    const opts = Object.entries(l.opts || {}).map(([k, v]) => `${OPTION_LABEL[k] || k}: ${v}`).join(" · ");
    return `<div class="line">
      ${imgTag(lineImg(l.sku), it.name)}
      <div><b>${esc(it.name)}</b>${opts ? `<small>${esc(opts)}</small>` : ""}${it.kind === "custom" ? "<small>Made to order · 1–2 weeks</small>" : ""}
        <small>${it.kind === "unique" ? "One of one" : qtyCtl(i, l.qty)}
        <button class="rm" type="button" data-rm="${i}">Remove</button></small></div>
      <div class="amt">${money(Math.round(unitPrice(l.sku) * l.qty * 100) / 100)}</div>
    </div>`;
  }).join("");
  const bb = blindTotals(cart);
  const blindRows = cart.map((l, i) => CAT.items[l.sku]?.kind === "blind"
    ? `<small><b>${esc(BLIND.find(b => b.sku === l.sku)?.title || l.sku)}</b> ${qtyCtl(i, l.qty)} <button class="rm" type="button" data-rm="${i}">Remove</button></small>` : "").join("");
  const bs = CAT.blindBox.bundleSize, left = bs - (bb.n % bs);
  const blindLine = bb.n ? `<div class="line">
      ${imgTag("img/blind-box.jpg", "Blind box")}
      <div><b>Blind box · ${bb.n} ${bb.n === 1 ? "item" : "items"}</b>${blindRows}
        <small>${bb.n >= bs && left === bs ? `${bs} for $${CAT.blindBox.bundlePrice} applied` : `Add ${left} more to get ${bs} for $${CAT.blindBox.bundlePrice}`}</small></div>
      <div class="amt">${money(bb.total)}</div>
    </div>` : "";
  const addon = `<div class="addon">
    <h3>Add a little surprise</h3>
    <p>Handmade blind box: $${CAT.blindBox.each} each, any ${CAT.blindBox.bundleSize} for $${CAT.blindBox.bundlePrice}. Mix stickers and mini prints.</p>
    ${BLIND.map(b => `<div class="row"><span><b>${esc(b.title)}</b> <small class="muted">${esc(b.note)}</small></span><button class="btn small ghost" type="button" data-add-blind="${b.sku}">+ Add</button></div>`).join("")}
  </div>`;
  body.innerHTML = (cart.length ? lines + blindLine : `<p class="empty">Your cart is empty.</p>`) + addon;
  const t = cartTotals(cart);
  const ready = !!CHECKOUT_URL;
  foot.innerHTML = cart.length ? `
    ${t.save > 0 ? `<div class="sum save"><span>You save</span><span>−${money(t.save)}</span></div>` : ""}
    <div class="sum"><span>Shipping (US)</span><span>${t.ship ? money(t.ship) : "Free"}</span></div>
    ${t.ship ? `<p class="hint" style="margin:0">Add ${money(t.toFree)} more for free US shipping</p>` : ""}
    <div class="sum total"><span>Total</span><span>${money(t.sub + t.ship)}</span></div>
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
  $("#banner-title").textContent = `${CAT.sale.label} · ${Math.round(CAT.sale.off * 100)}% off selected items`;
  $("#banner-time").textContent = (st === "before" ? `Starts Nov 11 · in ${t}` : `Ends Dec 11 · ${t} left`) + (PREVIEW_SALE ? " · PREVIEW" : "");
  return true;
}

/* ===== SHOP PAGE ===== */
function renderShop() {
  renderOriginals();
  const host = $("#products-linocut");
  if (host) host.innerHTML = SHOP.filter(p => p.section === "linocut").map(productTile).join("") + customTile();
  renderBlindStrip();
  renderEtchBlocks();
}
// Small tile for the 2-column grid: photo, name, price. Taps open the product page.
function tilePrice(p) {
  if (p.variants.length === 1) return priceHTML(p.variants[0].sku);
  const min = Math.min(...p.variants.map(v => unitPrice(v.sku)));
  return `<span class="price"><span class="from">from</span><span class="now">${money(min)}</span></span>`;
}
function productTile(p) {
  return `<a class="pcard" href="${ROOT}product/index.html#${esc(p.id)}">
    <div class="pimg">${imgTag(p.img, p.alt)}<span class="tag">${esc(p.tag)}</span></div>
    <b>${esc(p.title)}</b>${tilePrice(p)}</a>`;
}
// Extra tile after the products: leads to the Custom page.
function customTile() {
  return `<a class="pcard" href="${ROOT}custom/index.html">
    <div class="pimg"><img src="${ROOT}img/blocks.jpg" alt="Carved pink rubber blocks" loading="lazy"><span class="tag">Custom</span></div>
    <b>Custom stamp / Re-carve a design</b><span class="price"><span class="from">from</span><span class="now">$38</span></span></a>`;
}
function renderEtchBlocks() {
  const host = $("#etch-blocks"); if (!host) return;
  host.innerHTML = CAT.etchings.map(x => `<a class="pcard" href="${ROOT}etchings/index.html#${esc(x.id)}">
    <div class="pimg">${imgTag(x.cover || x.prints?.[0]?.img || "", x.title)}<span class="tag">Etching</span></div>
    <b>${esc(x.title)}</b><span class="price">${x.prints.length ? `<span class="from">from</span><span class="now">${money(Math.min(...x.prints.map(p => p.price)))}</span>` : `<span class="muted" style="font-size:13px">Scans coming soon</span>`}</span></a>`).join("");
}

/* ===== PRODUCT PAGE ===== */
function renderProduct() {
  const host = $("#product"); if (!host) return;
  const p = SHOP.find(x => x.id === location.hash.slice(1));
  if (!p) { host.innerHTML = `<p class="empty">This product could not be found. <a href="${ROOT}shop/index.html">Back to shop</a></p>`; return; }
  document.title = `${p.title} · Sihao Chen`;
  const hasVersion = p.variants.some(v => CAT.items[v.sku]?.options?.version);
  const gallery = [p.img, ...(p.gallery || [])].filter(Boolean);
  host.innerHTML = `<a class="back" href="${ROOT}shop/index.html">← Back to shop</a>
    <div class="pd card">
      <div class="pd-media">
        <div class="ph pd-main" data-photo>${imgTag(p.img, p.alt)}</div>
        ${gallery.length > 1 ? `<div class="pd-strip">${gallery.map((g, i) => `<button type="button" class="thumb" data-g="${i}"><img src="${esc(ROOT + g)}" alt="${esc(p.title)} photo ${i + 1}"></button>`).join("")}</div>` : ""}
      </div>
      <div class="pd-info">
        <p class="label">${esc(p.tag)}</p>
        <h1>${esc(p.title)}</h1>
        <div class="foot" data-foot></div>
        ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ""}
        <ul class="specs">${p.specs.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
        <p class="note-line">Free US shipping over $20 · ships within 1 week</p>
      </div>
    </div>
    ${hasVersion ? `<div class="pd-versions">
      <h2 class="sub">Two versions, same price</h2>
      <div class="versions">
        <div class="version">${VERSION_IMGS["Signed Print"] ? `<img src="${esc(ROOT + VERSION_IMGS["Signed Print"])}" alt="Back of a signed print with logo stamp, name and date" loading="lazy">` : `<div class="ph-box">Photo coming</div>`}
          <div><h3>Signed Print</h3><p>Back signed with my name, date and logo stamp. Packed in a clear sleeve. Limited stock.</p></div></div>
        <div class="version">${VERSION_IMGS["Postcard"] ? `<img src="${esc(ROOT + VERSION_IMGS["Postcard"])}" alt="Hand-printed postcard back" loading="lazy">` : `<div class="ph-box">Photo coming<br>postcard back</div>`}
          <div><h3>Postcard</h3><p>Hand-printed postcard back, ready to write on and mail. Signed in pencil on the front.</p></div></div>
      </div></div>` : ""}
    <div class="pd-more"><h2 class="sub">You may also like</h2>
      <div class="tiles">${SHOP.filter(x => x.id !== p.id).slice(0, 4).map(productTile).join("")}</div></div>`;
  const main = host.querySelector("[data-photo]");
  setupCard(p, host.querySelector("[data-foot]"), main);
  host.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => {
    main.innerHTML = `<img src="${esc(ROOT + gallery[+b.dataset.g])}" alt="${esc(p.title)}">`;
  }));
}
function setupCard(p, foot, photoEl) {
  const state = { v: 0, opts: {}, qty: 1 };
  const photo = photoEl || foot.closest(".card").querySelector("[data-photo]");
  function showPhoto() {
    const ver = state.opts.version;
    const src = ver && ver in VERSION_IMGS ? VERSION_IMGS[ver] : p.img;
    const alt = ver ? `${p.title}, ${ver} back` : p.alt;
    const label = ver && !src ? `Photo coming<br>${esc(ver)} back` : "";
    photo.innerHTML = (src ? `<img src="${esc(ROOT + src)}" alt="${esc(alt)}">` : `<div class="ph-box">${label || "Photo coming"}</div>`) + `<span class="tag">${esc(ver || p.tag)}</span>`;
  }
  function draw() {
    showPhoto();
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
  host.innerHTML = `<a class="back" href="${ROOT}shop/index.html#etching">← Back to shop</a>
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

/* ===== CUSTOM PAGE: recarve existing designs ===== */
const RECARVES = [
  { sku: "recarve-giant-1", title: "Giant No.1", size: "4 × 4.5 in (10 × 11.5 cm)", img: "" },
  { sku: "recarve-giant-2", title: "Giant No.2", size: "4 × 4.5 in (10 × 11.5 cm)", img: "" },
  { sku: "recarve-giant-3", title: "Giant No.3", size: "4 × 4.5 in (10 × 11.5 cm)", img: "" },
  { sku: "recarve-giant-4", title: "Giant No.4", size: "4 × 4.5 in (10 × 11.5 cm)", img: "" },
  { sku: "recarve-giant-5", title: "Giant No.5", size: "4 × 4.5 in (10 × 11.5 cm)", img: "" },
  { sku: "recarve-snake", title: "Snake (original)", size: "4 × 6 in (10 × 15 cm)", img: "" }
];
function renderRecarves() {
  const host = $("#recarves"); if (!host) return;
  host.innerHTML = RECARVES.map(r => `<div class="tile">${r.img ? `<img src="${esc(ROOT + r.img)}" alt="${esc(r.title)} block" loading="lazy">` : `<div class="ph-box">Photo coming<br>${esc(r.title)}</div>`}
    <div class="row"><b>${esc(r.title)}</b><span class="p">${money(CAT.items[r.sku].price)}</span></div>
    ${r.size ? `<div class="muted" style="font-size:.85em">${esc(r.size)}</div>` : ""}
    <button class="btn small" type="button" data-recarve="${r.sku}">Add to cart</button></div>`).join("");
  host.querySelectorAll("[data-recarve]").forEach(b => b.addEventListener("click", () => addToCart(b.dataset.recarve)));
}

/* ===== PORTFOLIO (home) ===== */
function renderPortfolio() {
  const tabs = $("#pf-tabs"), grid = $("#pf"); if (!tabs || !grid || !CAT.portfolio) return;
  const cats = ["All", ...CAT.portfolio.categories];
  const current = decodeURIComponent(location.hash.slice(1)) || "All";
  const active = cats.includes(current) ? current : "All";
  tabs.innerHTML = cats.map(c => `<a class="chip" href="#${encodeURIComponent(c)}" aria-pressed="${c === active}" style="text-decoration:none">${esc(c)}</a>`).join("");
  const works = CAT.portfolio.works.filter(w => active === "All" || w.cat === active);
  grid.innerHTML = works.map(w => `<figure>${w.img ? `<img src="${esc(ROOT + w.img)}" alt="${esc(w.title || w.cat)}" loading="lazy">` : `<div class="ph-box">Photo coming<br>${esc(w.cat)}</div>`}${w.title ? `<figcaption>${esc(w.title)}</figcaption>` : ""}</figure>`).join("");
}

/* ===== ORIGINALS PAGE ===== */
function renderOriginals() {
  const host = $("#products-others"); if (!host) return;
  host.innerHTML = CAT.originals.map(o => `<div class="pcard">
    <div class="pimg">${imgTag(o.img, o.title)}<span class="tag">One of one</span></div>
    <b>${esc(o.title)}</b>
    <span class="meta">${esc(o.medium)}${o.size ? " · " + esc(o.size) : ""}</span>
    ${o.price ? `<span class="price"><span class="now">${money(o.price)}</span></span>` : `<span class="muted" style="font-size:13px">Price coming soon</span>`}
    <a class="btn small ghost" href="${DM}" target="_blank" rel="noopener">Inquire</a>
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
  if (PAGE === "custom") renderRecarves();
  if (PAGE === "product") { renderProduct(); addEventListener("hashchange", () => { renderProduct(); scrollTo(0, 0); }); }
  if (PAGE === "portfolio") { renderPortfolio(); addEventListener("hashchange", renderPortfolio); }
  let wasSale = saleState();
  if (tickBanner()) {
    const t = setInterval(() => {
      if (!tickBanner()) clearInterval(t);
      const s = saleState(); if (s !== wasSale) { wasSale = s; if (PAGE === "shop") renderShop(); renderDrawer(); }
    }, 1000);
  }
})();
