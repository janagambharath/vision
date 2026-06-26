/* ─── Constants ─────────────────────────────────────── */
const CLINIC_WHATSAPP_NUMBER = "917842938316";
const LEAD_STORAGE_KEY       = "visionVistara.tryOnLeads.v3";
const CONTACT_STORAGE_KEY    = "visionVistara.contact.v2";
const MAX_LOCAL_LEADS        = 50;
const MAX_HOME_TRIAL_FRAMES  = 5;
const HOME_TRIAL_BASE_FEE    = 199;
const HOME_TRIAL_FREE_THRESHOLD = 7000;
const HOME_TRIAL_DEPOSIT     = 500;

/* ─── Frame catalog ──────────────────────────────────── */
const FRAME_CATEGORY_OPTIONS = ["Men","Women","Unisex","Premium","Titanium","Transparent","Round","Square","Full Rim"];

const STATUS_OPTIONS = [
  ["new","New"],["contacted","Contacted"],["try-on-done","Try-on Done"],
  ["home-trial-booked","Home Trial Booked"],["frame-selected","Frame Selected"],
  ["payment-pending","Payment Pending"],["booked","Booked"],
  ["delivered","Delivered"],["converted","Converted"]
];

const FRAME_CATALOG = [
  {
    id: "supersight-b-titanium-6009",
    sku: "6009",
    name: "B-Titanium IP 6009",
    brand: "Supersight Evelicar",
    category: "Titanium",
    categories: ["Men","Women","Premium","Titanium","Round","Full Rim"],
    material: "B-Titanium",
    shape: "Round",
    size: "46-21-140",
    colour: "Gloss Black",
    availability: "In stock",
    price: 2499,
    priceLabel: "Rs. 2,499",
    description: "Premium B-Titanium frame with gloss black finish. Lightweight, durable, and ideal for all-day wear. Includes nose pad adjustments and Supersight IP coating.",
    file: "assets/inventory/supersight-b-titanium-6009/front.png",
    arFile: "assets/inventory/supersight-b-titanium-6009/ar-front.png",
    detailImages: [
      { label: "Front View", file: "assets/inventory/supersight-b-titanium-6009/front.png" }
    ],
    measurements: "46-21-140",
    suitableFaceShapes: "Oval, square, heart, and smaller round face shapes after in-clinic fit check.",
    lensCompatibility: "Prescription lenses, anti-reflective coating, photochromic lenses, and blue-light lenses after prescription verification."
  },
  {
    id: "suphous-pink-96409",
    sku: "96409",
    name: "Suphous 96409",
    brand: "Suphous Eyewear",
    category: "Full Rim",
    categories: ["Women","Premium","Transparent","Square","Full Rim"],
    material: "Acetate",
    shape: "Square",
    size: "49D17-142",
    colour: "Transparent Pink",
    availability: "In stock",
    price: 1899,
    priceLabel: "Rs. 1,899",
    description: "Transparent pink full-rim acetate frame with a modern square silhouette. Lightweight, hypoallergenic, and adjustable for comfortable all-day fit.",
    file: "assets/inventory/suphous-pink-96409/front.png",
    arFile: "assets/inventory/suphous-pink-96409/ar-front.png",
    hoverFile: "assets/inventory/suphous-pink-96409/left45.png",
    detailImages: [
      { label: "Front View",  file: "assets/inventory/suphous-pink-96409/front.png" },
      { label: "Side View",   file: "assets/inventory/suphous-pink-96409/left45.png" }
    ],
    measurements: "49D17-142",
    suitableFaceShapes: "Oval, round, and heart face shapes after in-clinic fit check.",
    lensCompatibility: "Prescription lenses, anti-reflective coating, photochromic lenses, and blue-light lenses after prescription verification."
  },
  {
    id: "supersight-classic-round-5012",
    sku: "5012",
    name: "Classic Round 5012",
    brand: "Supersight",
    category: "Round",
    categories: ["Men","Unisex","Round","Full Rim"],
    material: "Acetate",
    shape: "Round",
    size: "48-20-145",
    colour: "Matte Black",
    availability: "In stock",
    price: 1599,
    priceLabel: "Rs. 1,599",
    description: "Classic round acetate frame with a matte black finish. Evergreen style that suits oval and square face shapes. Comfortable spring hinge temples.",
    file: "assets/inventory/supersight-b-titanium-6009/front.png",
    arFile: "assets/inventory/supersight-b-titanium-6009/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/supersight-b-titanium-6009/front.png" }],
    measurements: "48-20-145",
    suitableFaceShapes: "Oval, square, and oblong face shapes.",
    lensCompatibility: "Prescription, anti-reflective, photochromic, blue-light lenses."
  },
  {
    id: "suphous-blue-square-88120",
    sku: "88120",
    name: "Blue Frame 88120",
    brand: "Suphous Eyewear",
    category: "Square",
    categories: ["Unisex","Transparent","Square","Full Rim"],
    material: "Polycarbonate",
    shape: "Square",
    size: "50-18-140",
    colour: "Transparent Blue",
    availability: "In stock",
    price: 1399,
    priceLabel: "Rs. 1,399",
    description: "Transparent blue polycarbonate square frame. Impact-resistant, lightweight, and UV-stable. A contemporary everyday choice.",
    file: "assets/inventory/suphous-pink-96409/front.png",
    arFile: "assets/inventory/suphous-pink-96409/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/suphous-pink-96409/front.png" }],
    measurements: "50-18-140",
    suitableFaceShapes: "Oval and heart face shapes.",
    lensCompatibility: "Prescription, anti-reflective, blue-light lenses."
  },
  {
    id: "supersight-rimless-titanium-3001",
    sku: "3001",
    name: "Rimless Titanium 3001",
    brand: "Supersight Evelicar",
    category: "Titanium",
    categories: ["Men","Women","Premium","Titanium"],
    material: "Pure Titanium",
    shape: "Oval",
    size: "52-17-145",
    colour: "Brushed Gold",
    availability: "In stock",
    price: 3499,
    priceLabel: "Rs. 3,499",
    description: "Ultra-lightweight pure titanium rimless frame with brushed gold temples. Premium choice for professionals who prefer a barely-there look.",
    file: "assets/inventory/supersight-b-titanium-6009/front.png",
    arFile: "assets/inventory/supersight-b-titanium-6009/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/supersight-b-titanium-6009/front.png" }],
    measurements: "52-17-145",
    suitableFaceShapes: "All face shapes. Best suited to oval and oblong faces.",
    lensCompatibility: "Prescription, anti-reflective, high-index, photochromic lenses."
  },
  {
    id: "suphous-gradient-rose-66201",
    sku: "66201",
    name: "Gradient Rose 66201",
    brand: "Suphous Eyewear",
    category: "Round",
    categories: ["Women","Transparent","Round","Full Rim"],
    material: "Acetate",
    shape: "Round",
    size: "47-19-142",
    colour: "Gradient Rose",
    availability: "In stock",
    price: 1799,
    priceLabel: "Rs. 1,799",
    description: "Gradient rose acetate round frame with a feminine colour fade. Lightweight and comfortable with adjustable nose pads.",
    file: "assets/inventory/suphous-pink-96409/front.png",
    arFile: "assets/inventory/suphous-pink-96409/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/suphous-pink-96409/front.png" }],
    measurements: "47-19-142",
    suitableFaceShapes: "Oval, square, and heart face shapes.",
    lensCompatibility: "Prescription, anti-reflective, photochromic, blue-light lenses."
  },
  {
    id: "supersight-sport-flex-4060",
    sku: "4060",
    name: "Sport Flex 4060",
    brand: "Supersight",
    category: "Full Rim",
    categories: ["Men","Unisex","Full Rim","Square"],
    material: "TR-90 Nylon",
    shape: "Rectangle",
    size: "54-18-145",
    colour: "Matte Gunmetal",
    availability: "In stock",
    price: 2099,
    priceLabel: "Rs. 2,099",
    description: "Flexible TR-90 nylon frame with titanium-reinforced spring hinges. Built for active lifestyles. Lightweight and impact-resistant.",
    file: "assets/inventory/supersight-b-titanium-6009/front.png",
    arFile: "assets/inventory/supersight-b-titanium-6009/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/supersight-b-titanium-6009/front.png" }],
    measurements: "54-18-145",
    suitableFaceShapes: "Oval, oblong, and square face shapes.",
    lensCompatibility: "Prescription, anti-reflective, blue-light, polarised lenses."
  },
  {
    id: "suphous-crystal-premium-77200",
    sku: "77200",
    name: "Crystal Premium 77200",
    brand: "Suphous Eyewear",
    category: "Premium",
    categories: ["Women","Premium","Transparent","Full Rim"],
    material: "Acetate",
    shape: "Cat-Eye",
    size: "51-17-140",
    colour: "Crystal Clear",
    availability: "In stock",
    price: 2299,
    priceLabel: "Rs. 2,299",
    description: "Crystal clear cat-eye acetate frame with subtle flare. Premium finish with hand-polished hinges. A showroom favourite.",
    file: "assets/inventory/suphous-pink-96409/front.png",
    arFile: "assets/inventory/suphous-pink-96409/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/suphous-pink-96409/front.png" }],
    measurements: "51-17-140",
    suitableFaceShapes: "Oval and round face shapes.",
    lensCompatibility: "Prescription, anti-reflective, photochromic, blue-light lenses."
  },
  {
    id: "supersight-executive-3300",
    sku: "3300",
    name: "Executive 3300",
    brand: "Supersight Evelicar",
    category: "Premium",
    categories: ["Men","Premium","Titanium","Square","Full Rim"],
    material: "Titanium Alloy",
    shape: "Rectangle",
    size: "53-17-145",
    colour: "Brushed Gunmetal",
    availability: "In stock",
    price: 3199,
    priceLabel: "Rs. 3,199",
    description: "Premium titanium alloy rectangular frame with brushed gunmetal finish. Designed for executives and professionals. Featherweight at 14g.",
    file: "assets/inventory/supersight-b-titanium-6009/front.png",
    arFile: "assets/inventory/supersight-b-titanium-6009/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/supersight-b-titanium-6009/front.png" }],
    measurements: "53-17-145",
    suitableFaceShapes: "Oval, oblong, and square face shapes.",
    lensCompatibility: "Prescription, anti-reflective, high-index, photochromic, blue-light lenses."
  },
  {
    id: "suphous-weekend-tortoise-99401",
    sku: "99401",
    name: "Weekend 99401",
    brand: "Suphous Eyewear",
    category: "Round",
    categories: ["Women","Unisex","Round","Full Rim"],
    material: "Acetate",
    shape: "Round",
    size: "49-20-145",
    colour: "Honey Tortoise",
    availability: "In stock",
    price: 1699,
    priceLabel: "Rs. 1,699",
    description: "Warm honey tortoise acetate round frame. A timeless weekend-wear option that complements most skin tones. Spring hinge temples.",
    file: "assets/inventory/suphous-pink-96409/front.png",
    arFile: "assets/inventory/suphous-pink-96409/ar-front.png",
    detailImages: [{ label: "Front View", file: "assets/inventory/suphous-pink-96409/front.png" }],
    measurements: "49-20-145",
    suitableFaceShapes: "Oval, square, and heart face shapes.",
    lensCompatibility: "Prescription, anti-reflective, photochromic, blue-light lenses."
  }
];

/* ─── DOM refs ─────────────────────────────────────────── */
const header              = document.querySelector("[data-header]");
const menuToggle          = document.querySelector("[data-menu-toggle]");
const mobileMenu          = document.querySelector("[data-mobile-menu]");
const appointmentForm     = document.querySelector("[data-appointment-form]");
const hero                = document.querySelector(".hero");
const mobileStickyActions = document.querySelector(".mobile-sticky-actions");

const tryOn = {
  section:         document.querySelector("#tryon"),
  openButtons:     document.querySelectorAll("[data-open-tryon]"),
  selfieInput:     document.querySelector("[data-selfie-input]"),
  selfieWorkspace: document.querySelector("[data-selfie-workspace]"),
  generateButton:  document.querySelector("[data-generate-tryon]"),
  aiState:         document.querySelector("[data-ai-state]"),
  uploadState:     document.querySelector("[data-upload-state]"),
  previewGrid:     document.querySelector("[data-preview-grid]"),
  beforeImage:     document.querySelector("[data-before-img]"),
  beforePlaceholder: document.querySelector("[data-before-placeholder]"),
  resultPlaceholder: document.querySelector("[data-result-placeholder]"),
  frameName:       document.querySelector("[data-frame-name]"),
  frameCategory:   document.querySelector("[data-frame-category]"),
  frameMeta:       document.querySelector("[data-frame-meta]"),
  categoryList:    document.querySelector("[data-frame-categories]"),
  thumbs:          document.querySelector("[data-frame-thumbs]"),
  prevButton:      document.querySelector("[data-prev-frame]"),
  nextButton:      document.querySelector("[data-next-frame]"),
  retakeButton:    document.querySelector("[data-retake]"),
  downloadButton:  document.querySelector("[data-download]"),
  previewPanel:    document.querySelector("[data-preview-panel]"),
  previewImage:    document.querySelector("[data-preview-img]"),
  leadForm:        document.querySelector("[data-lead-form]"),
  leadNote:        document.querySelector("[data-lead-note]"),
  saveFavoriteButton: document.querySelector("[data-save-favorite]"),
  homeTrialButton: document.querySelector("[data-tryon-home]")
};

const commerce = {
  filters:      document.querySelector("[data-frame-filters]"),
  search:       document.querySelector("[data-frame-search]"),
  grid:         document.querySelector("[data-frame-grid]"),
  summary:      document.querySelector("[data-frame-summary]"),
  summaryItems: document.querySelector("[data-summary-items]"),
  summaryCount: document.querySelector("[data-summary-count]"),
  summaryTotal: document.querySelector("[data-summary-total]"),
  summaryLens:  document.querySelector("[data-summary-lens]"),
  summaryGrand: document.querySelector("[data-summary-grand]"),
  summaryFee:   document.querySelector("[data-summary-fee]"),
  summaryDeposit: document.querySelector("[data-summary-deposit]"),
  leadForm:     document.querySelector("[data-commerce-lead-form]"),
  note:         document.querySelector("[data-commerce-note]"),
  clearButton:  document.querySelector("[data-clear-selection]")
};

const homeTrial = {
  form:        document.querySelector("[data-home-trial-form]"),
  selected:    document.querySelector("[data-home-selected]"),
  count:       document.querySelector("[data-home-count]"),
  frameTotal:  document.querySelector("[data-home-frame-total]"),
  fee:         document.querySelector("[data-home-fee]"),
  deposit:     document.querySelector("[data-home-deposit]"),
  total:       document.querySelector("[data-home-total]"),
  note:        document.querySelector("[data-home-note]")
};

/* ─── Camera state ─────────────────────────────────────── */
const cam = {
  stream:      null,
  facingMode:  "user",
  videoEl:     document.querySelector("[data-camera-feed]"),
  panelEl:     document.querySelector("[data-camera-panel]"),
  openCardEl:  document.querySelector("[data-camera-open-card]"),
  errorEl:     document.querySelector("[data-camera-error]"),
  canvasEl:    document.querySelector("[data-capture-canvas]")
};

/* ─── App state ────────────────────────────────────────── */
const state = {
  selectedIndex:    0,
  tryonCategory:    "All",   // separate from catalog
  catalogCategory:  "All",
  selectedLensPrice: 0,
  selectedFrameIds: new Set(),
  favoriteFrameIds: new Set(),
  selfieFile:       null,
  selfieDataUrl:    "",
  aiBusy:           false,
  capturedBlob:     null,
  capturedFile:     null,
  capturedDataUrl:  "",
  capturedObjectUrl: "",
  lastCaptureName:  ""
};

/* ─── Utils ────────────────────────────────────────────── */
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setPill(el, icon, text, muted = false) {
  if (!el) return;
  el.classList.toggle("muted", muted);
  el.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>${escapeHtml(text)}`;
  refreshIcons();
}

function setMenu(open) {
  if (!menuToggle || !mobileMenu) return;
  mobileMenu.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.classList.toggle("menu-open", open);
}

function updateHeader() {
  if (header) header.classList.toggle("scrolled", window.scrollY > 10);
}

function formatCurrency(v) {
  return `Rs. ${Number(v || 0).toLocaleString("en-IN")}`;
}

function hasNumericPrice(frame) {
  return frame && typeof frame.price === "number" && Number.isFinite(frame.price);
}

function getFramePrice(frame) {
  return hasNumericPrice(frame) ? frame.price : 0;
}

function getFramePriceLabel(frame) {
  return hasNumericPrice(frame) ? formatCurrency(frame.price) : (frame.priceLabel || "Price on request");
}

function getFrameTotalLabel(frames = getSelectedFrames()) {
  if (!frames.length) return formatCurrency(0);
  const total = frames.reduce((s, f) => s + getFramePrice(f), 0);
  const hasUnknown = frames.some(f => !hasNumericPrice(f));
  if (hasUnknown && total === 0) return "Price on request";
  if (hasUnknown) return `${formatCurrency(total)} + on request`;
  return formatCurrency(total);
}

function getStoredJson(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}

function setStoredJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function scrollToSection(sel) {
  const t = document.querySelector(sel);
  if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
}

function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function canvasToJpegBlob(canvas, quality = 0.86) {
  return new Promise((res, rej) => {
    canvas.toBlob(b => b ? res(b) : rej(new Error("Capture failed.")), "image/jpeg", quality);
  });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function normalizePhone(v) { return String(v || "").replace(/[^\d+]/g, ""); }
function isValidPhone(v) {
  const d = String(v || "").replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15;
}

function compactFileName(file) { return file && file.name ? file.name : ""; }
function getStatusLabel(v) {
  const m = STATUS_OPTIONS.find(([k]) => k === v);
  return m ? m[1] : "New";
}

/* ─── Frame helpers ─────────────────────────────────── */
function getSelectedFrame() { return FRAME_CATALOG[state.selectedIndex] || FRAME_CATALOG[0]; }
function getFrameById(id) { return FRAME_CATALOG.find(f => f.id === id) || null; }
function getSelectedFrames() { return Array.from(state.selectedFrameIds).map(getFrameById).filter(Boolean); }
function getSelectionTotal() { return getSelectedFrames().reduce((s, f) => s + getFramePrice(f), 0); }

function getTrialCosts() {
  const frames = getSelectedFrames();
  const frameTotal = getSelectionTotal();
  const serviceFee = frameTotal >= HOME_TRIAL_FREE_THRESHOLD ? 0 : HOME_TRIAL_BASE_FEE;
  const deposit = frames.length >= 3 ? HOME_TRIAL_DEPOSIT : 0;
  return { frameTotal, serviceFee, deposit, estimate: serviceFee + deposit };
}

function getGrandTotal() {
  return getSelectionTotal() + (state.selectedLensPrice || 0);
}

function getImageSrc(frame, purpose = "catalog") {
  if (!frame) return "";
  if (purpose === "ar") return frame.arFile || "";
  if (purpose === "hover") return frame.hoverFile || frame.file || "";
  return frame.file || "";
}

function assignFrameImage(img, frame, purpose = "catalog") {
  const src = getImageSrc(frame, purpose);
  if (!src) { img.hidden = true; return; }
  img.hidden = false;
  img.src = src;
  img.loading = "lazy";
  img.onerror = () => { img.hidden = true; img.removeAttribute("src"); };
}

function getTryOnFilteredFrames() {
  return FRAME_CATALOG.filter(f =>
    state.tryonCategory === "All" ||
    f.category === state.tryonCategory ||
    f.categories.includes(state.tryonCategory)
  );
}

function getCatalogFilteredFrames() {
  const q = ((commerce.search && commerce.search.value) || "").trim().toLowerCase();
  return FRAME_CATALOG.filter(f => {
    const catMatch = state.catalogCategory === "All" ||
      f.category === state.catalogCategory ||
      f.categories.includes(state.catalogCategory);
    if (!catMatch) return false;
    if (!q) return true;
    return [f.sku, f.name, f.brand, f.category, f.material, f.shape,
            f.size, f.colour, f.availability, f.description, ...f.categories]
      .join(" ").toLowerCase().includes(q);
  });
}

function getAvailableCategories() {
  const avail = new Set();
  FRAME_CATALOG.forEach(f => f.categories.forEach(c => avail.add(c)));
  return FRAME_CATEGORY_OPTIONS
    .filter(c => avail.has(c))
    .concat(Array.from(avail).filter(c => !FRAME_CATEGORY_OPTIONS.includes(c)));
}

/* ─── Render helpers ────────────────────────────────── */
function renderTryOnCategories() {
  if (!tryOn.categoryList) return;
  const cats = ["All", ...getAvailableCategories()];
  tryOn.categoryList.innerHTML = "";
  cats.forEach(c => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = c;
    btn.classList.toggle("active", c === state.tryonCategory);
    btn.addEventListener("click", () => { state.tryonCategory = c; renderAllFrameSurfaces(); });
    tryOn.categoryList.appendChild(btn);
  });
}

function renderCatalogFilters() {
  if (!commerce.filters) return;
  const cats = ["All", ...getAvailableCategories()];
  commerce.filters.innerHTML = "";
  cats.forEach(c => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = c;
    btn.classList.toggle("active", c === state.catalogCategory);
    btn.addEventListener("click", () => { state.catalogCategory = c; renderAllFrameSurfaces(); });
    commerce.filters.appendChild(btn);
  });
}

function renderFrameThumbs() {
  if (!tryOn.thumbs) return;
  const frames = getTryOnFilteredFrames();
  tryOn.thumbs.innerHTML = "";
  frames.forEach(f => {
    const origIdx = FRAME_CATALOG.findIndex(x => x.id === f.id);
    const btn = document.createElement("button");
    const img = document.createElement("img");
    const nm  = document.createElement("strong");
    const mt  = document.createElement("span");
    btn.type = "button";
    btn.className = "frame-thumb";
    btn.classList.toggle("active", origIdx === state.selectedIndex);
    btn.classList.toggle("saved", state.selectedFrameIds.has(f.id));
    btn.setAttribute("aria-label", `Select ${f.name}`);
    img.alt = "";
    assignFrameImage(img, f);
    nm.textContent = f.name;
    mt.textContent = `${f.category} | ${getFramePriceLabel(f)}`;
    btn.append(img, nm, mt);
    btn.addEventListener("click", () => selectFrame(origIdx));
    tryOn.thumbs.appendChild(btn);
  });
}

function renderProductGrid() {
  if (!commerce.grid) return;
  const frames = getCatalogFilteredFrames();
  commerce.grid.innerHTML = "";
  if (!frames.length) {
    const e = document.createElement("div");
    e.className = "catalog-empty";
    e.textContent = "No frames match this filter.";
    commerce.grid.appendChild(e);
    return;
  }

  frames.forEach(frame => {
    const card = document.createElement("article");
    const img  = document.createElement("img");
    const hoverImg = frame.hoverFile ? document.createElement("img") : null;
    const selected = state.selectedFrameIds.has(frame.id);
    const favorite = state.favoriteFrameIds.has(frame.id);
    const detailImages = frame.detailImages || [];

    card.className = "product-card";
    if (hoverImg) card.classList.add("has-hover");
    card.dataset.frameId = frame.id;

    img.alt = `${frame.brand} ${frame.name} front view`;
    img.className = "product-main-image";
    assignFrameImage(img, frame);
    if (hoverImg) {
      hoverImg.alt = `${frame.brand} ${frame.name} angle view`;
      hoverImg.className = "product-hover-image";
      assignFrameImage(hoverImg, frame, "hover");
    }

    card.innerHTML = `
      <div class="product-media"></div>
      <div class="product-copy">
        <div class="product-title-row">
          <div>
            <span>${escapeHtml(frame.brand)}</span>
            <h3>${escapeHtml(frame.name)}</h3>
          </div>
          <div class="product-commercials">
            <strong>${escapeHtml(getFramePriceLabel(frame))}</strong>
            <em>${escapeHtml(frame.availability || "In stock")}</em>
          </div>
        </div>
        <div class="product-tags">
          ${frame.categories.slice(0,4).map(c => `<span>${escapeHtml(c)}</span>`).join("")}
        </div>
        <p>${escapeHtml(frame.description)}</p>
        <dl class="product-specs">
          <div><dt>Brand</dt><dd>${escapeHtml(frame.brand)}</dd></div>
          <div><dt>Material</dt><dd>${escapeHtml(frame.material)}</dd></div>
          <div><dt>Shape</dt><dd>${escapeHtml(frame.shape || frame.category)}</dd></div>
          <div><dt>Size</dt><dd>${escapeHtml(frame.size || frame.measurements || "Confirm in clinic")}</dd></div>
          <div><dt>Colour</dt><dd>${escapeHtml(frame.colour || "As photographed")}</dd></div>
          <div><dt>Availability</dt><dd>${escapeHtml(frame.availability || "In stock")}</dd></div>
        </dl>
        <details class="frame-detail">
          <summary>Product details</summary>
          <div class="detail-gallery">
            ${detailImages.map(item => `
              <figure>
                <img src="${escapeHtml(item.file)}" alt="${escapeHtml(frame.brand)} ${escapeHtml(frame.name)} ${escapeHtml(item.label)}" loading="lazy">
                <figcaption>${escapeHtml(item.label)}</figcaption>
              </figure>
            `).join("")}
          </div>
          <dl class="detail-specs">
            <div><dt>SKU</dt><dd>${escapeHtml(frame.sku || frame.id)}</dd></div>
            <div><dt>Measurements</dt><dd>${escapeHtml(frame.measurements || frame.size || "Confirm in clinic")}</dd></div>
            <div><dt>Suitable face shapes</dt><dd>${escapeHtml(frame.suitableFaceShapes || "Confirm during fitting")}</dd></div>
            <div><dt>Lens compatibility</dt><dd>${escapeHtml(frame.lensCompatibility || "Confirm during prescription check")}</dd></div>
          </dl>
        </details>
        <div class="product-actions">
          <button class="btn btn-primary btn-small" type="button" data-frame-action="try-live">
            <i data-lucide="scan-face" aria-hidden="true"></i>
            <span>Try with Selfie</span>
          </button>
          <button class="btn btn-light btn-small" type="button" data-frame-action="try-home">
            <i data-lucide="house" aria-hidden="true"></i>
            <span>Try At Home</span>
          </button>
          <button class="btn btn-light btn-small" type="button" data-frame-action="buy-now">
            <i data-lucide="shopping-bag" aria-hidden="true"></i>
            <span>Buy Now</span>
          </button>
          <button class="btn btn-whatsapp btn-small" type="button" data-frame-action="whatsapp">
            <i data-lucide="message-circle" aria-hidden="true"></i>
            <span>WhatsApp</span>
          </button>
          <button class="text-button product-select ${selected ? "active" : ""}" type="button" data-frame-action="select">
            <i data-lucide="${selected ? "check-circle-2" : favorite ? "bookmark" : "plus"}" aria-hidden="true"></i>
            ${selected ? "Selected" : favorite ? "Favorite" : "Select"}
          </button>
        </div>
      </div>
    `;

    card.querySelector(".product-media").append(img, ...(hoverImg ? [hoverImg] : []));
    commerce.grid.appendChild(card);
  });

  refreshIcons();
}

function makeSummaryItem(frame, compact = false) {
  const item   = document.createElement("div");
  const img    = document.createElement("img");
  const copy   = document.createElement("div");
  const remove = document.createElement("button");
  item.className = "summary-item";
  img.alt = "";
  assignFrameImage(img, frame);
  copy.innerHTML = `<strong>${escapeHtml(frame.name)}</strong><span>${escapeHtml(frame.brand)} | ${escapeHtml(getFramePriceLabel(frame))}</span>`;
  remove.type = "button";
  remove.className = "icon-button mini";
  remove.setAttribute("aria-label", `Remove ${frame.name}`);
  remove.innerHTML = `<i data-lucide="x" aria-hidden="true"></i>`;
  remove.addEventListener("click", () => { state.selectedFrameIds.delete(frame.id); renderAllFrameSurfaces(); });
  item.append(img, copy);
  if (!compact) item.appendChild(remove);
  return item;
}

function renderLensUpsell() {
  // Keep lens radios in sync with state
  const radios = document.querySelectorAll("[data-lens-radio]");
  radios.forEach(r => {
    if (Number(r.value) === state.selectedLensPrice) r.checked = true;
  });
}

function renderFrameSummary() {
  const frames    = getSelectedFrames();
  const costs     = getTrialCosts();
  const lensTotal = state.selectedLensPrice || 0;
  const grandTotal = getSelectionTotal() + lensTotal;
  const countText = frames.length
    ? `${frames.length} frame${frames.length === 1 ? "" : "s"} selected`
    : "No frames selected";

  if (commerce.summary) commerce.summary.classList.toggle("home-highlight", frames.length > 1);
  if (commerce.summaryCount) commerce.summaryCount.textContent = countText;
  if (commerce.summaryTotal) commerce.summaryTotal.textContent = getFrameTotalLabel(frames);
  if (commerce.summaryLens) commerce.summaryLens.textContent = formatCurrency(lensTotal);
  if (commerce.summaryGrand) commerce.summaryGrand.textContent = formatCurrency(grandTotal);
  if (commerce.summaryFee) commerce.summaryFee.textContent = formatCurrency(costs.serviceFee);
  if (commerce.summaryDeposit) commerce.summaryDeposit.textContent = formatCurrency(costs.deposit);

  if (commerce.summaryItems) {
    commerce.summaryItems.innerHTML = "";
    if (!frames.length) {
      const e = document.createElement("p");
      e.className = "summary-empty";
      e.textContent = "Select one or more frames to create a shortlist.";
      commerce.summaryItems.appendChild(e);
    } else {
      frames.forEach(f => commerce.summaryItems.appendChild(makeSummaryItem(f)));
    }
  }

  if (homeTrial.count) homeTrial.count.textContent = countText;
  if (homeTrial.frameTotal) homeTrial.frameTotal.textContent = getFrameTotalLabel(frames);
  if (homeTrial.fee) homeTrial.fee.textContent = formatCurrency(costs.serviceFee);
  if (homeTrial.deposit) homeTrial.deposit.textContent = formatCurrency(costs.deposit);
  if (homeTrial.total) homeTrial.total.textContent = formatCurrency(costs.estimate);

  if (homeTrial.selected) {
    homeTrial.selected.innerHTML = "";
    if (!frames.length) {
      const e = document.createElement("p");
      e.className = "summary-empty";
      e.textContent = "Your selected frames will appear here.";
      homeTrial.selected.appendChild(e);
    } else {
      frames.forEach(f => homeTrial.selected.appendChild(makeSummaryItem(f, true)));
    }
  }

  renderLensUpsell();
  refreshIcons();
}

function renderAllFrameSurfaces() {
  renderTryOnCategories();
  renderCatalogFilters();
  renderFrameThumbs();
  renderProductGrid();
  renderFrameSummary();
}

function selectFrame(index) {
  state.selectedIndex = (index + FRAME_CATALOG.length) % FRAME_CATALOG.length;
  const frame = getSelectedFrame();
  if (tryOn.frameName)    tryOn.frameName.textContent = frame.name;
  if (tryOn.frameCategory) tryOn.frameCategory.textContent = frame.category;
  if (tryOn.frameMeta)    tryOn.frameMeta.textContent = `${frame.brand} | ${frame.material} | ${getFramePriceLabel(frame)}`;
  renderFrameThumbs();
  renderProductGrid();
}

function stepFrame(dir) {
  const frames = getTryOnFilteredFrames();
  const cur = frames.findIndex(f => f.id === getSelectedFrame().id);
  const next = cur === -1 ? 0 : (cur + dir + frames.length) % frames.length;
  selectFrame(FRAME_CATALOG.findIndex(f => f.id === frames[next].id));
}

function addFrameToSelection(id, showNote = true) {
  const frame = getFrameById(id);
  if (!frame) return false;
  if (state.selectedFrameIds.has(id)) { renderAllFrameSurfaces(); return true; }
  if (state.selectedFrameIds.size >= MAX_HOME_TRIAL_FRAMES) {
    const msg = `Select up to ${MAX_HOME_TRIAL_FRAMES} frames for home trial.`;
    if (commerce.note && showNote) commerce.note.textContent = msg;
    if (homeTrial.note && showNote) homeTrial.note.textContent = msg;
    return false;
  }
  state.selectedFrameIds.add(id);
  if (commerce.note && showNote) commerce.note.textContent = `${frame.name} added to your selection.`;
  if (homeTrial.note && showNote) homeTrial.note.textContent = "Home trial summary updated.";
  renderAllFrameSurfaces();
  return true;
}

function toggleFrameSelection(id) {
  if (state.selectedFrameIds.has(id)) { state.selectedFrameIds.delete(id); }
  else { addFrameToSelection(id, false); }
  renderAllFrameSurfaces();
}

function ensureAtLeastOneSelected() {
  if (!state.selectedFrameIds.size) addFrameToSelection(getSelectedFrame().id, false);
}

/* ─── Camera ─────────────────────────────────────────── */
async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    handleCameraError({ name: "NotSupportedError" });
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: cam.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    cam.stream = stream;
    if (cam.videoEl) {
      cam.videoEl.srcObject = stream;
      cam.videoEl.style.transform = cam.facingMode === "user" ? "scaleX(-1)" : "none";
      try { await cam.videoEl.play(); } catch { /* autoplay ok */ }
    }
    if (cam.panelEl) cam.panelEl.hidden = false;
    if (tryOn.selfieWorkspace) tryOn.selfieWorkspace.hidden = true;
    if (cam.errorEl) cam.errorEl.hidden = true;
    setPill(tryOn.uploadState, "video", "Camera active");
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Position your face in the guide and tap Capture Photo.";
  } catch (err) {
    handleCameraError(err);
  }
}

function closeCamera(showWorkspace = true) {
  if (cam.stream) { cam.stream.getTracks().forEach(t => t.stop()); cam.stream = null; }
  if (cam.videoEl) cam.videoEl.srcObject = null;
  if (cam.panelEl) cam.panelEl.hidden = true;
  if (showWorkspace && tryOn.selfieWorkspace) tryOn.selfieWorkspace.hidden = false;
}

async function captureFromCamera() {
  const video = cam.videoEl;
  if (!video || !cam.stream) return;

  const canvas = cam.canvasEl || document.createElement("canvas");
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext("2d");
  // Mirror for front camera (undo the CSS scaleX(-1))
  if (cam.facingMode === "user") {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0);

  try {
    const blob    = await canvasToJpegBlob(canvas, 0.9);
    const file    = new File([blob], "camera-selfie.jpg", { type: "image/jpeg" });
    const dataUrl = await blobToDataUrl(blob);

    state.selfieFile    = file;
    state.selfieDataUrl = dataUrl;
    state.capturedBlob  = null;
    state.capturedFile  = null;
    state.capturedDataUrl = "";

    if (tryOn.beforeImage) { tryOn.beforeImage.hidden = false; tryOn.beforeImage.src = dataUrl; }
    if (tryOn.beforePlaceholder) tryOn.beforePlaceholder.hidden = true;
    if (tryOn.previewImage) { tryOn.previewImage.hidden = true; tryOn.previewImage.removeAttribute("src"); }
    if (tryOn.resultPlaceholder) tryOn.resultPlaceholder.hidden = false;
    if (tryOn.previewGrid) tryOn.previewGrid.hidden = false;
    if (tryOn.previewPanel) tryOn.previewPanel.hidden = true;

    closeCamera(false);
    if (tryOn.selfieWorkspace) tryOn.selfieWorkspace.hidden = true;

    setPill(tryOn.uploadState, "badge-check", "Photo captured");
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Photo captured. Generate your AI try-on preview.";
    setTryOnBusy(false);
  } catch (err) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Photo capture failed. Please try again.";
  }
}

async function switchCamera() {
  cam.facingMode = cam.facingMode === "user" ? "environment" : "user";
  if (cam.stream) { cam.stream.getTracks().forEach(t => t.stop()); cam.stream = null; }
  if (cam.videoEl) cam.videoEl.srcObject = null;
  await openCamera();
}

function handleCameraError(err) {
  let msg = "Camera could not start. Upload a photo instead.";
  if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    msg = "Camera access denied. Please allow camera access in your browser settings, or upload a photo instead.";
  } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
    msg = "No camera found on this device. Please upload a photo instead.";
  } else if (err.name === "NotReadableError") {
    msg = "Camera is in use by another app. Close it and try again, or upload a photo.";
  } else if (err.name === "NotSupportedError") {
    msg = "Camera access is not supported in this browser. Please upload a photo instead.";
  }
  if (cam.errorEl) { cam.errorEl.hidden = false; cam.errorEl.textContent = msg; }
  if (cam.panelEl) cam.panelEl.hidden = true;
  if (tryOn.selfieWorkspace) tryOn.selfieWorkspace.hidden = false;
  if (tryOn.leadNote) tryOn.leadNote.textContent = msg;
}

/* ─── Try-on logic ─────────────────────────────────── */
function setTryOnBusy(busy, message = "") {
  state.aiBusy = busy;
  if (tryOn.generateButton) tryOn.generateButton.disabled = busy || !state.selfieFile;
  setPill(tryOn.aiState, busy ? "loader-2" : "sparkles",
    message || (busy ? "Generating preview…" : "AI try-on ready"), busy);
}

function buildTryOnPrompt(frame) {
  return [
    "Create a realistic optical eyewear try-on image from the uploaded selfie.",
    "Preserve the person's identity, face shape, skin tone, hair, age, expression, beard or makeup.",
    `Apply the exact real inventory frame: ${frame.brand} ${frame.name}.`,
    `Frame details: ${frame.colour}, ${frame.shape}, ${frame.material}, size ${frame.size || frame.measurements}.`,
    "Preserve exact frame geometry, color, thickness, lens opening, and branding from the provided frame image.",
    "Do not redesign the frame. Do not change the person.",
    "Place the frame naturally on the face as a premium optical ecommerce try-on preview."
  ].join(" ");
}

async function createLocalTryOnPreview(frame) {
  const selfie = await loadImage(state.selfieDataUrl);
  const frameImg = await loadImage(frame.arFile || frame.file).catch(() => loadImage(frame.file));
  const canvas = document.createElement("canvas");
  const maxW = 1200;
  const ratio = Math.min(1, maxW / selfie.naturalWidth);
  canvas.width  = Math.round(selfie.naturalWidth  * ratio);
  canvas.height = Math.round(selfie.naturalHeight * ratio);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(selfie, 0, 0, canvas.width, canvas.height);

  const portrait = canvas.height >= canvas.width;
  const fw = canvas.width * (portrait ? 0.52 : 0.38);
  const fh = fw * (frameImg.naturalHeight / frameImg.naturalWidth);
  const x  = (canvas.width - fw) / 2;
  const y  = canvas.height * (portrait ? 0.31 : 0.34);

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur  = Math.max(6, fw * 0.018);
  ctx.shadowOffsetY = Math.max(2, fh * 0.02);
  ctx.drawImage(frameImg, x, y, fw, fh);
  ctx.restore();

  return new Promise((res, rej) => {
    canvas.toBlob(async blob => {
      if (!blob) { rej(new Error("Local preview failed.")); return; }
      res({ blob, dataUrl: await blobToDataUrl(blob) });
    }, "image/jpeg", 0.9);
  });
}

function showTryOnResult(dataUrl, blob = null, source = "ai") {
  const ts   = new Date();
  const safe = ts.toISOString().replace(/[:.]/g, "-");
  const fn   = `vision-vistara-tryon-${safe}.jpg`;

  if (state.capturedObjectUrl) URL.revokeObjectURL(state.capturedObjectUrl);
  state.capturedBlob       = blob;
  state.capturedDataUrl    = dataUrl;
  state.capturedObjectUrl  = blob ? URL.createObjectURL(blob) : "";
  state.capturedFile       = blob ? new File([blob], fn, { type: "image/jpeg" }) : null;
  state.lastCaptureName    = fn;

  if (tryOn.previewImage)      { tryOn.previewImage.hidden = false; tryOn.previewImage.src = dataUrl; }
  if (tryOn.resultPlaceholder)   tryOn.resultPlaceholder.hidden = true;
  if (tryOn.previewGrid)         tryOn.previewGrid.hidden = false;
  if (tryOn.previewPanel)        tryOn.previewPanel.hidden = false;
  if (tryOn.downloadButton)      tryOn.downloadButton.disabled = !dataUrl;

  if (tryOn.leadNote) {
    tryOn.leadNote.textContent = source === "ai"
      ? "AI try-on generated. Add your details and send to WhatsApp."
      : "Preview generated. Add your details and send to WhatsApp.";
  }
}

async function generateSelfieTryOn() {
  if (!state.selfieFile || !state.selfieDataUrl) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Take a photo or upload a selfie first.";
    return;
  }
  const frame = getSelectedFrame();
  addFrameToSelection(frame.id, false);
  setTryOnBusy(true, "Generating preview…");
  try {
    const local = await createLocalTryOnPreview(frame);
    showTryOnResult(local.dataUrl, local.blob, "local");
  } catch (err) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Preview failed. Try a clearer, front-facing photo.";
  }
  setTryOnBusy(false);
}

async function handleSelfieInput(event) {
  const file = event.currentTarget.files && event.currentTarget.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Please upload a selfie image file.";
    event.currentTarget.value = "";
    return;
  }
  state.selfieFile    = file;
  state.selfieDataUrl = await fileToDataUrl(file);
  state.capturedBlob  = null;
  state.capturedFile  = null;
  state.capturedDataUrl = "";

  if (tryOn.beforeImage)      { tryOn.beforeImage.hidden = false; tryOn.beforeImage.src = state.selfieDataUrl; }
  if (tryOn.beforePlaceholder) tryOn.beforePlaceholder.hidden = true;
  if (tryOn.previewImage)     { tryOn.previewImage.hidden = true; tryOn.previewImage.removeAttribute("src"); }
  if (tryOn.resultPlaceholder) tryOn.resultPlaceholder.hidden = false;
  if (tryOn.previewGrid)       tryOn.previewGrid.hidden = false;
  if (tryOn.previewPanel)      tryOn.previewPanel.hidden = true;
  if (tryOn.selfieWorkspace)   tryOn.selfieWorkspace.hidden = true;

  setPill(tryOn.uploadState, "badge-check", "Selfie uploaded");
  if (tryOn.leadNote) tryOn.leadNote.textContent = "Selfie ready. Tap Generate Try-On to see your preview.";
  setTryOnBusy(false);
}

function downloadCapture() {
  if (!state.capturedBlob && !state.capturedDataUrl) return;
  const link = document.createElement("a");
  link.href = state.capturedObjectUrl || state.capturedDataUrl;
  link.download = state.lastCaptureName || "vision-vistara-tryon.jpg";
  link.click();
}

function retakeCapture() {
  state.selfieFile = null;
  state.selfieDataUrl = "";
  state.capturedBlob = null;
  state.capturedFile = null;
  state.capturedDataUrl = "";
  state.lastCaptureName = "";
  if (state.capturedObjectUrl) { URL.revokeObjectURL(state.capturedObjectUrl); state.capturedObjectUrl = ""; }

  closeCamera(false);
  if (tryOn.selfieWorkspace)    tryOn.selfieWorkspace.hidden = false;
  if (tryOn.previewGrid)        tryOn.previewGrid.hidden = true;
  if (tryOn.previewPanel)       tryOn.previewPanel.hidden = true;
  if (tryOn.beforeImage)       { tryOn.beforeImage.hidden = true; tryOn.beforeImage.removeAttribute("src"); }
  if (tryOn.beforePlaceholder)  tryOn.beforePlaceholder.hidden = false;
  if (tryOn.previewImage)       tryOn.previewImage.removeAttribute("src");
  if (tryOn.resultPlaceholder)  tryOn.resultPlaceholder.hidden = false;
  if (tryOn.downloadButton)     tryOn.downloadButton.disabled = true;
  if (tryOn.selfieInput)        tryOn.selfieInput.value = "";
  setPill(tryOn.uploadState, "camera", "Open camera to start", true);
  if (tryOn.leadNote) tryOn.leadNote.textContent = "Upload a photo or open the camera to start your try-on.";
  setTryOnBusy(false);
}

/* ─── Lead / WhatsApp ───────────────────────────────── */
function getLeads() {
  const leads = getStoredJson(LEAD_STORAGE_KEY, []);
  return Array.isArray(leads) ? leads : [];
}

function saveLeads(leads) {
  // Strip large image data URLs before saving to avoid storage quota errors
  const safe = leads.slice(0, MAX_LOCAL_LEADS).map(lead => {
    const { imageUrl, ...rest } = lead; // imageUrl can be hundreds of KB
    return { ...rest, hasImage: !!imageUrl };
  });
  setStoredJson(LEAD_STORAGE_KEY, safe);
}

function upsertLead(lead) {
  const leads = getLeads().filter(l => l.id !== lead.id);
  leads.unshift(lead);
  saveLeads(leads);
}

function updateLeadStatus(id, status) {
  const leads = getLeads().map(l => l.id === id ? { ...l, status } : l);
  saveLeads(leads);
  renderAdminDashboard();
}

function makeLead(payload) {
  const frames = payload.selectedFrames || getSelectedFrames();
  const frameTotal = frames.reduce((s, f) => s + getFramePrice(f), 0);
  return {
    id: `vv-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    status: "new",
    selectedFrames: frames.map(f => ({
      id: f.id, name: f.name, brand: f.brand,
      category: f.category, material: f.material,
      shape: f.shape, size: f.size, colour: f.colour,
      availability: f.availability, price: f.price,
      priceLabel: getFramePriceLabel(f)
    })),
    frameTotal,
    frameTotalLabel: getFrameTotalLabel(frames),
    lensPrice: state.selectedLensPrice || 0,
    lensLabel: state.selectedLensPrice ? formatCurrency(state.selectedLensPrice) : "Frame only",
    ...payload
  };
}

function getFrameSummaryLines(frames) {
  if (!frames.length) return ["Selected frames: Not selected"];
  return [
    "Selected frames:",
    ...frames.map((f, i) => `${i + 1}. ${f.name} – ${f.brand} – ${getFramePriceLabel(f)}`)
  ];
}

function getLensLine(lead) {
  if (!lead.lensPrice || lead.lensPrice === 0) return "";
  return `Lens add-on: ${lead.lensLabel || formatCurrency(lead.lensPrice)}`;
}

function buildWhatsAppText(lead) {
  const frames = lead.selectedFrames || [];
  const grandTotal = (lead.frameTotal || 0) + (lead.lensPrice || 0);
  const lines = [
    "Hello Vision Vistara Optics & Lasers Eye Care,",
    "",
    `Request: ${lead.intent || lead.service || "Frame enquiry"}`,
    `Patient name: ${lead.name || "Not provided"}`,
    `Phone: ${lead.phone || "Not provided"}`,
    lead.location ? `Location: ${lead.location}` : "",
    lead.address  ? `Address: ${lead.address}`   : "",
    lead.bookingDate ? `Preferred date: ${lead.bookingDate}` : "",
    lead.bookingTime ? `Preferred time: ${lead.bookingTime}` : "",
    "",
    ...getFrameSummaryLines(frames),
    frames.length ? `Frame subtotal: ${lead.frameTotalLabel || getFrameTotalLabel(frames)}` : "",
    getLensLine(lead),
    grandTotal > 0 ? `Order total: ${formatCurrency(grandTotal)}` : "",
    lead.serviceFee !== undefined ? `Try-at-home fee: ${formatCurrency(lead.serviceFee)}` : "",
    lead.deposit    !== undefined ? `Refundable deposit: ${formatCurrency(lead.deposit)}`  : "",
    lead.photoIncluded    ? "Photo preview: Captured in browser. I can attach or share from my phone." : "",
    lead.prescriptionFile ? `Prescription file: ${lead.prescriptionFile}` : "",
    lead.message    ? `Message: ${lead.message}` : "",
    `Source: ${lead.source || "website"}`,
    `Submitted: ${new Date(lead.timestamp).toLocaleString()}`
  ].filter(Boolean);
  return lines.join("\n");
}

function buildWhatsAppUrl(text) {
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function openWhatsAppForLead(lead) {
  upsertLead(lead);
  window.open(buildWhatsAppUrl(buildWhatsAppText(lead)), "_blank", "noopener");
}

function rememberContact(form) {
  if (!form) return;
  const data = new FormData(form);
  const prev = getStoredJson(CONTACT_STORAGE_KEY, {});
  setStoredJson(CONTACT_STORAGE_KEY, {
    ...prev,
    name:     String(data.get("name")     || prev.name     || "").trim(),
    phone:    String(data.get("phone")    || prev.phone    || "").trim(),
    location: String(data.get("location") || prev.location || "").trim(),
    address:  String(data.get("address")  || prev.address  || "").trim()
  });
}

function hydrateContactForm(form) {
  if (!form) return;
  const saved = getStoredJson(CONTACT_STORAGE_KEY, {});
  ["name","phone","location","address"].forEach(n => {
    const inp = form.querySelector(`[name="${n}"]`);
    if (inp && saved[n] && !inp.value) inp.value = saved[n];
  });
  form.addEventListener("input", () => rememberContact(form));
}

/* ─── Form handlers ─────────────────────────────────── */
async function shareOrOpenWhatsApp(lead) {
  const text = buildWhatsAppText(lead);
  if (state.capturedFile && navigator.canShare && navigator.share &&
      navigator.canShare({ files: [state.capturedFile] })) {
    try {
      await navigator.share({ title: "Vision Vistara try-on", text, files: [state.capturedFile] });
      if (tryOn.leadNote) tryOn.leadNote.textContent = "Shared successfully.";
      return;
    } catch (e) {
      if (e.name === "AbortError") {
        if (tryOn.leadNote) tryOn.leadNote.textContent = "Share cancelled. Opening WhatsApp text fallback.";
      }
    }
  }
  window.open(buildWhatsAppUrl(text), "_blank", "noopener");
  if (tryOn.leadNote) tryOn.leadNote.textContent = "WhatsApp opened. Download the photo if you want to attach it manually.";
}

async function handleLeadSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) { form.reportValidity(); return; }

  // Allow sending if we have any photo (captured try-on OR uploaded selfie)
  if (!state.capturedDataUrl && !state.selfieDataUrl) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Take a photo or upload a selfie before sending.";
    return;
  }

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const phone = normalizePhone(data.get("phone"));
  const location = String(data.get("location") || "").trim();
  const prescriptionFile = compactFileName(data.get("prescription"));

  if (!isValidPhone(phone)) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Please enter a valid phone number.";
    return;
  }
  rememberContact(form);

  const frame = getSelectedFrame();
  const lead  = makeLead({
    name, phone, location,
    selectedFrames: [frame],
    intent: state.capturedDataUrl ? "Virtual try-on follow-up" : "Frame enquiry with selfie",
    service: "AI Try-On",
    source: state.capturedDataUrl ? "AI try-on" : "selfie upload",
    status: "try-on-done",
    photoIncluded: !!(state.capturedDataUrl || state.selfieDataUrl),
    prescriptionFile,
    filename: state.lastCaptureName || "vision-vistara-tryon.jpg"
  });

  upsertLead(lead);
  if (tryOn.leadNote) tryOn.leadNote.textContent = "Opening WhatsApp with your try-on details…";
  await shareOrOpenWhatsApp(lead);
}

function handleCommerceLeadSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  ensureAtLeastOneSelected();
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const data = new FormData(form);
  const name  = String(data.get("name") || "").trim();
  const phone = normalizePhone(data.get("phone"));
  const location = String(data.get("location") || "").trim();
  const intent   = event.submitter && event.submitter.value ? event.submitter.value : "WhatsApp Enquiry";

  if (!isValidPhone(phone)) {
    if (commerce.note) commerce.note.textContent = "Please enter a valid mobile number.";
    return;
  }
  rememberContact(form);
  const costs = getTrialCosts();
  const lead  = makeLead({
    name, phone, location, intent,
    service: intent,
    source: "frame selection summary",
    status: intent === "Try At Home" ? "home-trial-booked" : "frame-selected",
    serviceFee: intent === "Try At Home" ? costs.serviceFee : undefined,
    deposit:    intent === "Try At Home" ? costs.deposit    : undefined
  });

  openWhatsAppForLead(lead);
  if (commerce.note) commerce.note.textContent = "WhatsApp opened with your selected frames.";
}

function handleHomeTrialSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  ensureAtLeastOneSelected();
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const data = new FormData(form);
  const name  = String(data.get("name") || "").trim();
  const phone = normalizePhone(data.get("phone"));
  if (!isValidPhone(phone)) {
    if (homeTrial.note) homeTrial.note.textContent = "Please enter a valid mobile number.";
    return;
  }
  rememberContact(form);
  const costs = getTrialCosts();
  const lead  = makeLead({
    name, phone,
    address:     String(data.get("address") || "").trim(),
    bookingDate: String(data.get("date") || "").trim(),
    bookingTime: String(data.get("time") || "").trim(),
    prescriptionFile: compactFileName(data.get("prescription")),
    intent: "Try At Home", service: "Try At Home",
    source: "try-at-home booking", status: "home-trial-booked",
    serviceFee: costs.serviceFee, deposit: costs.deposit
  });
  openWhatsAppForLead(lead);
  if (homeTrial.note) homeTrial.note.textContent = "Home-trial request saved and opened in WhatsApp.";
}

// Fix: "Buy Now" on a card now scrolls to the lead form with the frame pre-selected
function openQuickFrameToForm(frame, intent) {
  addFrameToSelection(frame.id, false);
  scrollToSection("#frames");
  setTimeout(() => {
    if (commerce.note) {
      commerce.note.textContent = `${frame.name} selected. Enter your name and phone to ${intent === "Buy Now" ? "buy" : "enquire"}.`;
    }
    if (commerce.leadForm) {
      const nameInput = commerce.leadForm.querySelector('[name="name"]');
      if (nameInput && !nameInput.value) nameInput.focus();
    }
    renderAllFrameSurfaces();
  }, 450);
}

/* ─── Admin dashboard (in-page, for admin.html use) ── */
function renderAdminDashboard() {
  const listEl    = document.querySelector("[data-dashboard-list]");
  const searchEl  = document.querySelector("[data-lead-search]");
  const statusEl  = document.querySelector("[data-status-filter]");
  if (!listEl) return;

  const query  = ((searchEl && searchEl.value) || "").trim().toLowerCase();
  const status = statusEl ? statusEl.value : "all";
  const leads  = getLeads().filter(lead => {
    const sm = status === "all" || lead.status === status;
    const frameNames = (lead.selectedFrames || []).map(f => f.name).join(" ");
    const hay = [lead.name, lead.phone, lead.location, lead.address,
                 lead.service, lead.intent, lead.source, frameNames,
                 lead.bookingDate, lead.bookingTime, lead.timestamp].join(" ").toLowerCase();
    return sm && (!query || hay.includes(query));
  });

  listEl.innerHTML = "";
  if (!leads.length) {
    const e = document.createElement("div");
    e.className = "dashboard-empty";
    e.textContent = "No leads match this view yet.";
    listEl.appendChild(e);
    return;
  }

  leads.forEach(lead => {
    const card      = document.createElement("article");
    const meta      = document.createElement("div");
    const actions   = document.createElement("div");
    const statusSel = document.createElement("select");
    const waLink    = document.createElement("a");
    const frames    = lead.selectedFrames || [];
    const frameLabel = frames.length
      ? frames.map(f => `${f.name} (${getFramePriceLabel(f)})`).join(", ")
      : "No frame selected";

    card.className = "dashboard-card";
    meta.className = "lead-meta";
    meta.innerHTML = `
      <div class="lead-title-row">
        <h3>${escapeHtml(lead.name || "Unknown")}</h3>
        <span>${escapeHtml(getStatusLabel(lead.status))}</span>
      </div>
      <p>${escapeHtml(lead.phone || "—")}${lead.location ? ` | ${escapeHtml(lead.location)}` : ""}</p>
      <p>${escapeHtml(frameLabel)}</p>
      ${lead.lensLabel && lead.lensPrice ? `<p>Lens: ${escapeHtml(lead.lensLabel)}</p>` : ""}
      <small>${escapeHtml(lead.service || lead.intent || "Lead")} | ${escapeHtml(new Date(lead.timestamp).toLocaleString())}</small>
      ${lead.bookingDate ? `<small>${escapeHtml(lead.bookingDate)}${lead.bookingTime ? ` – ${escapeHtml(lead.bookingTime)}` : ""}</small>` : ""}
    `;

    actions.className = "lead-actions";
    STATUS_OPTIONS.forEach(([v, l]) => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = l;
      opt.selected = lead.status === v;
      statusSel.appendChild(opt);
    });
    statusSel.setAttribute("aria-label", `Status for ${lead.name || "lead"}`);
    statusSel.addEventListener("change", () => updateLeadStatus(lead.id, statusSel.value));

    waLink.href   = buildWhatsAppUrl(buildWhatsAppText(lead));
    waLink.target = "_blank"; waLink.rel = "noopener";
    waLink.innerHTML = `<i data-lucide="message-circle" aria-hidden="true"></i>Follow up`;

    actions.append(statusSel, waLink);
    card.append(meta, actions);
    listEl.appendChild(card);
  });
  refreshIcons();
}

/* ─── Setup functions ───────────────────────────────── */
function setupNavigation() {
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });
  }
  if (mobileMenu) {
    mobileMenu.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  if (hero && mobileStickyActions && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      mobileStickyActions.classList.toggle("is-visible", !e.isIntersecting);
    }, { threshold: 0.12 }).observe(hero);
  }
}

function setupCamera() {
  const openBtn    = document.querySelector("[data-open-camera]");
  const closeBtn   = document.querySelector("[data-close-camera]");
  const captureBtn = document.querySelector("[data-capture-photo]");
  const switchBtn  = document.querySelector("[data-switch-camera]");

  if (openBtn)    openBtn.addEventListener("click", openCamera);
  if (closeBtn)   closeBtn.addEventListener("click", () => closeCamera(true));
  if (captureBtn) captureBtn.addEventListener("click", captureFromCamera);
  if (switchBtn)  switchBtn.addEventListener("click", switchCamera);

  window.addEventListener("beforeunload", () => {
    if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
  });
}

function setupLensUpsell() {
  const radios = document.querySelectorAll("[data-lens-radio]");
  radios.forEach(r => {
    r.addEventListener("change", () => {
      state.selectedLensPrice = Number(r.value) || 0;
      renderFrameSummary();
    });
  });
}

function setupTryOn() {
  renderAllFrameSurfaces();
  selectFrame(0);

  tryOn.openButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      scrollToSection("#tryon");
      setTimeout(() => {
        if (tryOn.selfieInput && tryOn.selfieWorkspace && !tryOn.selfieWorkspace.hidden) {
          tryOn.selfieInput.focus();
        }
      }, 350);
    });
  });

  if (tryOn.prevButton)     tryOn.prevButton.addEventListener("click", () => stepFrame(-1));
  if (tryOn.nextButton)     tryOn.nextButton.addEventListener("click", () => stepFrame(1));
  if (tryOn.selfieInput)    tryOn.selfieInput.addEventListener("change", handleSelfieInput);
  if (tryOn.generateButton) tryOn.generateButton.addEventListener("click", generateSelfieTryOn);
  if (tryOn.retakeButton)   tryOn.retakeButton.addEventListener("click", retakeCapture);
  if (tryOn.downloadButton) tryOn.downloadButton.addEventListener("click", downloadCapture);

  if (tryOn.saveFavoriteButton) {
    tryOn.saveFavoriteButton.addEventListener("click", () => {
      const frame = getSelectedFrame();
      state.favoriteFrameIds.add(frame.id);
      addFrameToSelection(frame.id);
      if (tryOn.leadNote) tryOn.leadNote.textContent = `${frame.name} saved to your frame selection.`;
    });
  }
  if (tryOn.homeTrialButton) {
    tryOn.homeTrialButton.addEventListener("click", () => {
      addFrameToSelection(getSelectedFrame().id);
      scrollToSection("#home-trial");
    });
  }
  if (tryOn.leadForm) {
    hydrateContactForm(tryOn.leadForm);
    tryOn.leadForm.addEventListener("submit", handleLeadSubmit);
  }

  // Touch swipe for frame navigation
  const viewport = document.querySelector(".tryon-stage");
  if (viewport) {
    let sx = 0, sy = 0;
    viewport.addEventListener("touchstart", e => {
      const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    viewport.addEventListener("touchend", e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) stepFrame(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  setTryOnBusy(false);
}

function setupCommerce() {
  if (commerce.search) commerce.search.addEventListener("input", renderProductGrid);

  if (commerce.grid) {
    commerce.grid.addEventListener("click", e => {
      const btn  = e.target.closest("[data-frame-action]");
      const card = e.target.closest("[data-frame-id]");
      if (!btn || !card) return;

      const frame = getFrameById(card.dataset.frameId);
      if (!frame) return;
      const idx = FRAME_CATALOG.findIndex(x => x.id === frame.id);
      const action = btn.dataset.frameAction;

      if (action === "select") {
        toggleFrameSelection(frame.id);
      } else if (action === "try-live") {
        selectFrame(idx);
        addFrameToSelection(frame.id, false);
        scrollToSection("#tryon");
        if (tryOn.leadNote) tryOn.leadNote.textContent = `${frame.name} selected. Upload a selfie or open the camera.`;
        setTimeout(() => {
          if (tryOn.selfieInput && tryOn.selfieWorkspace && !tryOn.selfieWorkspace.hidden) {
            tryOn.selfieInput.focus();
          }
        }, 350);
      } else if (action === "try-home") {
        addFrameToSelection(frame.id);
        scrollToSection("#home-trial");
      } else if (action === "buy-now") {
        openQuickFrameToForm(frame, "Buy Now");
      } else if (action === "whatsapp") {
        openQuickFrameToForm(frame, "WhatsApp Enquiry");
      }
    });
  }

  if (commerce.clearButton) {
    commerce.clearButton.addEventListener("click", () => {
      state.selectedFrameIds.clear();
      state.selectedLensPrice = 0;
      document.querySelectorAll("[data-lens-radio]").forEach(r => { r.checked = Number(r.value) === 0; });
      if (commerce.note) commerce.note.textContent = "Selection cleared.";
      renderAllFrameSurfaces();
    });
  }

  if (commerce.leadForm) {
    hydrateContactForm(commerce.leadForm);
    commerce.leadForm.addEventListener("submit", handleCommerceLeadSubmit);
  }
}

function setupHomeTrial() {
  if (!homeTrial.form) return;
  hydrateContactForm(homeTrial.form);
  const dateInput = homeTrial.form.querySelector('input[name="date"]');
  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }
  homeTrial.form.addEventListener("submit", handleHomeTrialSubmit);
}

function setupAppointmentForm() {
  if (!appointmentForm) return;
  hydrateContactForm(appointmentForm);
  const dateInput = appointmentForm.querySelector('input[name="date"]');
  const note = appointmentForm.querySelector("[data-form-note]");
  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }
  appointmentForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!appointmentForm.checkValidity()) { appointmentForm.reportValidity(); return; }
    const data = new FormData(appointmentForm);
    const name  = String(data.get("name") || "").trim();
    const phone = normalizePhone(data.get("phone"));
    if (!isValidPhone(phone)) { if (note) note.textContent = "Please enter a valid phone number."; return; }
    rememberContact(appointmentForm);
    const lead = makeLead({
      name, phone,
      service:     String(data.get("service") || "").trim(),
      intent:      "Appointment request",
      source:      "appointment form",
      status:      "booked",
      bookingDate: String(data.get("date") || "").trim(),
      bookingTime: String(data.get("time") || "").trim(),
      message:     String(data.get("message") || "").trim()
    });
    upsertLead(lead);
    if (note) note.textContent = "Opening WhatsApp with your appointment request…";
    window.open(buildWhatsAppUrl(buildWhatsAppText(lead)), "_blank", "noopener");
  });
}

function setupRevealAnimations() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(
    ".section-heading,.section-copy,.tryon-shell,.commerce-layout,.service-grid article,.trust-grid article,.diagnostic-grid article,.testimonial-grid article,.doctor-profile,.home-trial-form,.home-summary-panel,.faq-list details,.contact-details"
  );
  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("revealed")); return;
  }
  items.forEach(el => el.setAttribute("data-reveal", ""));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("revealed"); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  items.forEach(el => obs.observe(el));
}

/* ─── Init ──────────────────────────────────────────── */
setupNavigation();
setupCamera();
setupLensUpsell();
setupTryOn();
setupCommerce();
setupHomeTrial();
setupAppointmentForm();
setupRevealAnimations();
renderAdminDashboard(); // no-op on main page (no [data-dashboard-list])
refreshIcons();
