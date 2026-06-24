const CLINIC_WHATSAPP_NUMBER = "917842938316";
const BACKEND_LEAD_ENDPOINT = "/api/tryon-leads";
const LEAD_STORAGE_KEY = "visionVistara.tryOnLeads.v2";
const CONTACT_STORAGE_KEY = "visionVistara.contact.v2";
const MAX_LOCAL_LEADS = 35;
const MAX_HOME_TRIAL_FRAMES = 5;
const HOME_TRIAL_BASE_FEE = 199;
const HOME_TRIAL_FREE_THRESHOLD = 7000;
const HOME_TRIAL_DEPOSIT = 500;

const FRAME_CATEGORY_OPTIONS = [
  "Men",
  "Women",
  "Kids",
  "Premium",
  "Titanium",
  "Blue Light",
  "Rimless",
  "Full Rim",
  "Half Rim"
];

const STATUS_OPTIONS = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["try-on-done", "Try-on Done"],
  ["home-trial-booked", "Home Trial Booked"],
  ["frame-selected", "Frame Selected"],
  ["payment-pending", "Payment Pending"],
  ["booked", "Booked"],
  ["delivered", "Delivered"],
  ["converted", "Converted"]
];

const FRAME_CATALOG = [
  {
    id: "aurora-full-rim",
    name: "Aurora Full Rim",
    brand: "Vistara Studio",
    category: "Full Rim",
    categories: ["Men", "Women", "Premium", "Full Rim"],
    material: "Italian acetate",
    price: 2950,
    description: "A confident full-rim frame with a polished clinic-to-workday finish.",
    file: "assets/frames/aurora-full-rim.png",
    style: "full",
    rim: "#111827",
    accent: "#d7bb77",
    lens: "rgba(214, 244, 255, 0.18)"
  },
  {
    id: "vista-half-rim",
    name: "Vista Half Rim",
    brand: "Vistara Studio",
    category: "Half Rim",
    categories: ["Men", "Half Rim", "Blue Light"],
    material: "Stainless steel",
    price: 2650,
    description: "Lightweight office styling with a clean upper-rim profile.",
    file: "assets/frames/vista-half-rim.png",
    style: "half",
    rim: "#263348",
    accent: "#56d8f5",
    lens: "rgba(214, 244, 255, 0.14)"
  },
  {
    id: "clear-rimless",
    name: "Clear Rimless",
    brand: "Clarity",
    category: "Rimless",
    categories: ["Women", "Premium", "Rimless"],
    material: "Memory alloy",
    price: 4200,
    description: "Minimal, elegant, and nearly invisible for a soft professional look.",
    file: "assets/frames/clear-rimless.png",
    style: "rimless",
    rim: "#d8e8ff",
    accent: "#9bb2cb",
    lens: "rgba(233, 250, 255, 0.22)"
  },
  {
    id: "titanium-line",
    name: "Titanium Line",
    brand: "Aero Ti",
    category: "Titanium",
    categories: ["Men", "Women", "Premium", "Titanium"],
    material: "Pure titanium",
    price: 5400,
    description: "Premium comfort, corrosion resistance, and a refined metal finish.",
    file: "assets/frames/titanium-line.png",
    style: "titanium",
    rim: "#c7a96a",
    accent: "#f0dca5",
    lens: "rgba(236, 248, 255, 0.15)"
  },
  {
    id: "noir-fashion",
    name: "Noir Fashion",
    brand: "Maison Noir",
    category: "Premium",
    categories: ["Women", "Premium", "Full Rim"],
    material: "High-density acetate",
    price: 4850,
    description: "A showroom statement frame with a graceful premium edge.",
    file: "assets/frames/noir-fashion.png",
    style: "fashion",
    rim: "#090b12",
    accent: "#d99bb1",
    lens: "rgba(231, 242, 255, 0.13)"
  },
  {
    id: "blue-light-focus",
    name: "Blue Light Focus",
    brand: "ScreenGuard",
    category: "Blue Light",
    categories: ["Men", "Women", "Blue Light", "Full Rim"],
    material: "TR90 polymer",
    price: 2200,
    description: "Screen-friendly daily wear for study, office work, and long calls.",
    file: "assets/frames/blue-light-focus.png",
    style: "blue",
    rim: "#1d4ed8",
    accent: "#56d8f5",
    lens: "rgba(104, 210, 255, 0.2)"
  },
  {
    id: "junior-soft",
    name: "Junior Soft",
    brand: "Little Vista",
    category: "Kids",
    categories: ["Kids", "Full Rim"],
    material: "Flexible silicone",
    price: 1800,
    description: "Soft, durable, and practical for young wearers and active days.",
    file: "assets/frames/junior-soft.png",
    style: "kids",
    rim: "#2563eb",
    accent: "#28c58a",
    lens: "rgba(240, 248, 255, 0.16)"
  },
  {
    id: "airflex-half-rim",
    name: "AirFlex Half Rim",
    brand: "Aero Lite",
    category: "Half Rim",
    categories: ["Men", "Women", "Half Rim", "Titanium"],
    material: "Beta titanium",
    price: 3650,
    description: "A low-weight half-rim frame for crisp, understated daily wear.",
    file: "assets/frames/airflex-half-rim.png",
    style: "half",
    rim: "#334155",
    accent: "#d7bb77",
    lens: "rgba(222, 245, 255, 0.15)"
  }
];

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const appointmentForm = document.querySelector("[data-appointment-form]");
const hero = document.querySelector(".hero");
const mobileStickyActions = document.querySelector(".mobile-sticky-actions");

const tryOn = {
  section: document.querySelector("#tryon"),
  canvas: document.querySelector("[data-tryon-canvas]"),
  video: document.querySelector("[data-video]"),
  viewport: document.querySelector("[data-tryon-view]"),
  cameraPanel: document.querySelector("[data-camera-panel]"),
  cameraHelp: document.querySelector("[data-camera-help]"),
  startButtons: document.querySelectorAll("[data-start-camera], [data-open-tryon]"),
  cameraState: document.querySelector("[data-camera-state]"),
  trackingState: document.querySelector("[data-tracking-state]"),
  frameName: document.querySelector("[data-frame-name]"),
  frameCategory: document.querySelector("[data-frame-category]"),
  frameMeta: document.querySelector("[data-frame-meta]"),
  categoryList: document.querySelector("[data-frame-categories]"),
  thumbs: document.querySelector("[data-frame-thumbs]"),
  prevButton: document.querySelector("[data-prev-frame]"),
  nextButton: document.querySelector("[data-next-frame]"),
  captureButton: document.querySelector("[data-capture]"),
  retakeButton: document.querySelector("[data-retake]"),
  downloadButton: document.querySelector("[data-download]"),
  previewPanel: document.querySelector("[data-preview-panel]"),
  previewImage: document.querySelector("[data-preview-img]"),
  leadForm: document.querySelector("[data-lead-form]"),
  leadNote: document.querySelector("[data-lead-note]"),
  saveFavoriteButton: document.querySelector("[data-save-favorite]"),
  homeTrialButton: document.querySelector("[data-tryon-home]")
};

const commerce = {
  filters: document.querySelector("[data-frame-filters]"),
  search: document.querySelector("[data-frame-search]"),
  grid: document.querySelector("[data-frame-grid]"),
  summary: document.querySelector("[data-frame-summary]"),
  summaryItems: document.querySelector("[data-summary-items]"),
  summaryCount: document.querySelector("[data-summary-count]"),
  summaryTotal: document.querySelector("[data-summary-total]"),
  summaryFee: document.querySelector("[data-summary-fee]"),
  summaryDeposit: document.querySelector("[data-summary-deposit]"),
  leadForm: document.querySelector("[data-commerce-lead-form]"),
  note: document.querySelector("[data-commerce-note]"),
  clearButton: document.querySelector("[data-clear-selection]")
};

const homeTrial = {
  form: document.querySelector("[data-home-trial-form]"),
  selected: document.querySelector("[data-home-selected]"),
  count: document.querySelector("[data-home-count]"),
  frameTotal: document.querySelector("[data-home-frame-total]"),
  fee: document.querySelector("[data-home-fee]"),
  deposit: document.querySelector("[data-home-deposit]"),
  total: document.querySelector("[data-home-total]"),
  note: document.querySelector("[data-home-note]")
};

const dashboard = {
  list: document.querySelector("[data-dashboard-list]"),
  search: document.querySelector("[data-lead-search]"),
  status: document.querySelector("[data-status-filter]")
};

const state = {
  selectedIndex: 0,
  selectedCategory: "All",
  selectedFrameIds: new Set(),
  favoriteFrameIds: new Set(),
  frameImages: new Map(),
  stream: null,
  faceMesh: null,
  faceMeshUnavailable: false,
  active: false,
  rendering: false,
  analyzing: false,
  analysisRunning: false,
  trackingFailures: 0,
  lastLandmarks: null,
  capturedBlob: null,
  capturedFile: null,
  capturedDataUrl: "",
  capturedObjectUrl: "",
  lastCaptureName: ""
};

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setPill(element, icon, text, muted = false) {
  if (!element) return;
  element.classList.toggle("muted", muted);
  element.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>${escapeHtml(text)}`;
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
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 10);
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function getStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function setStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Local storage can fail in private browsing or when image payloads exceed quota.
  }
}

function getSelectedFrame() {
  return FRAME_CATALOG[state.selectedIndex] || FRAME_CATALOG[0];
}

function getFrameById(id) {
  return FRAME_CATALOG.find((frame) => frame.id === id) || null;
}

function getSelectedFrames() {
  return Array.from(state.selectedFrameIds)
    .map(getFrameById)
    .filter(Boolean);
}

function getSelectionTotal() {
  return getSelectedFrames().reduce((sum, frame) => sum + frame.price, 0);
}

function getTrialCosts() {
  const frames = getSelectedFrames();
  const frameTotal = getSelectionTotal();
  const serviceFee = frameTotal >= HOME_TRIAL_FREE_THRESHOLD ? 0 : HOME_TRIAL_BASE_FEE;
  const deposit = frames.length >= 3 ? HOME_TRIAL_DEPOSIT : 0;
  return {
    frameTotal,
    serviceFee,
    deposit,
    estimate: serviceFee + deposit
  };
}

function getStatusLabel(value) {
  const match = STATUS_OPTIONS.find(([key]) => key === value);
  return match ? match[1] : "New";
}

function makeFrameSvg(frame) {
  const rim = frame.rim;
  const accent = frame.accent;
  const lens = frame.lens;
  const stroke = frame.style === "kids" ? 24 : frame.style === "rimless" ? 6 : frame.style === "titanium" ? 10 : 18;
  let body = "";

  if (frame.style === "half") {
    body = `
      <path d="M78 128c9-48 49-73 122-73 68 0 108 22 119 67" fill="none" stroke="${rim}" stroke-width="${stroke}" stroke-linecap="round"/>
      <path d="M520 122c11-45 51-67 119-67 73 0 113 25 122 73" fill="none" stroke="${rim}" stroke-width="${stroke}" stroke-linecap="round"/>
      <path d="M90 132c8 58 48 88 116 88 68 0 107-30 116-88" fill="${lens}" stroke="${accent}" stroke-width="5" opacity="0.9"/>
      <path d="M506 132c9 58 48 88 116 88 68 0 108-30 116-88" fill="${lens}" stroke="${accent}" stroke-width="5" opacity="0.9"/>
      <path d="M319 126c35-22 72-22 108 0" fill="none" stroke="${rim}" stroke-width="9" stroke-linecap="round"/>`;
  } else if (frame.style === "rimless") {
    body = `
      <path d="M86 133c7-50 48-77 119-77s112 27 119 77c-8 57-48 86-119 86s-111-29-119-86Z" fill="${lens}" stroke="${rim}" stroke-width="${stroke}"/>
      <path d="M514 133c7-50 48-77 119-77s112 27 119 77c-8 57-48 86-119 86s-111-29-119-86Z" fill="${lens}" stroke="${rim}" stroke-width="${stroke}"/>
      <circle cx="307" cy="128" r="8" fill="${accent}"/>
      <circle cx="531" cy="128" r="8" fill="${accent}"/>
      <path d="M316 128c37-23 76-23 113 0" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`;
  } else if (frame.style === "fashion") {
    body = `
      <path d="M58 126c24-58 76-82 151-69 72 12 112 37 122 77-18 57-66 84-143 78-78-7-122-35-130-86Z" fill="${lens}" stroke="${rim}" stroke-width="${stroke}" stroke-linejoin="round"/>
      <path d="M508 134c10-40 50-65 122-77 75-13 127 11 151 69-8 51-52 79-130 86-77 6-125-21-143-78Z" fill="${lens}" stroke="${rim}" stroke-width="${stroke}" stroke-linejoin="round"/>
      <path d="M331 132c30-18 70-18 101 0" fill="none" stroke="${rim}" stroke-width="12" stroke-linecap="round"/>
      <path d="M69 112c-20-8-34-8-48 3M770 112c20-8 34-8 48 3" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>`;
  } else {
    const rx = frame.style === "kids" ? 58 : frame.style === "blue" ? 48 : 54;
    body = `
      <rect x="78" y="58" width="250" height="154" rx="${rx}" fill="${lens}" stroke="${rim}" stroke-width="${stroke}"/>
      <rect x="512" y="58" width="250" height="154" rx="${rx}" fill="${lens}" stroke="${rim}" stroke-width="${stroke}"/>
      <path d="M328 134c33-22 72-22 105 0" fill="none" stroke="${rim}" stroke-width="${Math.max(8, stroke - 6)}" stroke-linecap="round"/>
      <path d="M73 132H23M767 132h50" fill="none" stroke="${accent}" stroke-width="${Math.max(8, stroke - 8)}" stroke-linecap="round"/>`;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 270">
      <defs>
        <filter id="shadow" x="-15%" y="-25%" width="130%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000000" flood-opacity="0.22"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">${body}</g>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getImageSrc(frame) {
  return frame.file || makeFrameSvg(frame);
}

function assignFrameImage(img, frame) {
  img.src = getImageSrc(frame);
  img.onerror = () => {
    img.onerror = null;
    img.src = makeFrameSvg(frame);
  };
}

function getFrameImage(frame) {
  if (state.frameImages.has(frame.id)) {
    return state.frameImages.get(frame.id);
  }

  const image = new Image();
  const entry = { image, loaded: false, failed: false };
  let usingFallback = false;

  image.onload = () => {
    entry.loaded = true;
    if (getSelectedFrame().id === frame.id) {
      requestAnimationFrame(drawTryOnFrame);
    }
  };

  image.onerror = () => {
    if (!usingFallback) {
      usingFallback = true;
      image.src = makeFrameSvg(frame);
      return;
    }
    entry.failed = true;
  };

  image.decoding = "async";
  image.src = getImageSrc(frame);
  state.frameImages.set(frame.id, entry);
  return entry;
}

function getFilteredFrames() {
  const categoryMatch = (frame) => (
    state.selectedCategory === "All" ||
    frame.category === state.selectedCategory ||
    frame.categories.includes(state.selectedCategory)
  );
  return FRAME_CATALOG.filter(categoryMatch);
}

function getCatalogFrames() {
  const query = (commerce.search && commerce.search.value ? commerce.search.value : "").trim().toLowerCase();
  return getFilteredFrames().filter((frame) => {
    if (!query) return true;
    return [
      frame.name,
      frame.brand,
      frame.category,
      frame.material,
      frame.description,
      ...frame.categories
    ].join(" ").toLowerCase().includes(query);
  });
}

function renderTryOnCategories() {
  if (!tryOn.categoryList) return;
  const categories = ["All", ...FRAME_CATEGORY_OPTIONS];
  tryOn.categoryList.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.classList.toggle("active", category === state.selectedCategory);
    button.addEventListener("click", () => {
      state.selectedCategory = category;
      renderAllFrameSurfaces();
    });
    tryOn.categoryList.appendChild(button);
  });
}

function renderCatalogFilters() {
  if (!commerce.filters) return;
  const categories = ["All", ...FRAME_CATEGORY_OPTIONS];
  commerce.filters.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.classList.toggle("active", category === state.selectedCategory);
    button.addEventListener("click", () => {
      state.selectedCategory = category;
      renderAllFrameSurfaces();
    });
    commerce.filters.appendChild(button);
  });
}

function renderFrameThumbs() {
  if (!tryOn.thumbs) return;
  const frames = getFilteredFrames();
  tryOn.thumbs.innerHTML = "";

  frames.forEach((frame) => {
    const originalIndex = FRAME_CATALOG.findIndex((item) => item.id === frame.id);
    const button = document.createElement("button");
    const image = document.createElement("img");
    const name = document.createElement("strong");
    const meta = document.createElement("span");

    button.type = "button";
    button.className = "frame-thumb";
    button.classList.toggle("active", originalIndex === state.selectedIndex);
    button.classList.toggle("saved", state.selectedFrameIds.has(frame.id));
    button.setAttribute("aria-label", `Select ${frame.name}`);

    image.alt = "";
    assignFrameImage(image, frame);

    name.textContent = frame.name;
    meta.textContent = `${frame.category} | ${formatCurrency(frame.price)}`;

    button.append(image, name, meta);
    button.addEventListener("click", () => selectFrame(originalIndex));
    tryOn.thumbs.appendChild(button);
  });
}

function renderProductGrid() {
  if (!commerce.grid) return;
  const frames = getCatalogFrames();
  commerce.grid.innerHTML = "";

  if (!frames.length) {
    const empty = document.createElement("div");
    empty.className = "catalog-empty";
    empty.textContent = "No frames match this filter.";
    commerce.grid.appendChild(empty);
    return;
  }

  frames.forEach((frame) => {
    const card = document.createElement("article");
    const image = document.createElement("img");
    const selected = state.selectedFrameIds.has(frame.id);
    const favorite = state.favoriteFrameIds.has(frame.id);

    card.className = "product-card";
    card.dataset.frameId = frame.id;

    image.alt = `${frame.name} spectacle frame`;
    assignFrameImage(image, frame);

    card.innerHTML = `
      <div class="product-media"></div>
      <div class="product-copy">
        <div class="product-title-row">
          <div>
            <span>${escapeHtml(frame.brand)}</span>
            <h3>${escapeHtml(frame.name)}</h3>
          </div>
          <strong>${formatCurrency(frame.price)}</strong>
        </div>
        <div class="product-tags">
          ${frame.categories.slice(0, 4).map((category) => `<span>${escapeHtml(category)}</span>`).join("")}
        </div>
        <p>${escapeHtml(frame.description)}</p>
        <dl class="product-specs">
          <div><dt>Category</dt><dd>${escapeHtml(frame.category)}</dd></div>
          <div><dt>Material</dt><dd>${escapeHtml(frame.material)}</dd></div>
        </dl>
        <details class="frame-detail">
          <summary>Frame details</summary>
          <p>${escapeHtml(frame.brand)} ${escapeHtml(frame.name)} is a ${escapeHtml(frame.material.toLowerCase())} frame for ${escapeHtml(frame.categories.join(", ").toLowerCase())} use.</p>
        </details>
        <div class="product-actions">
          <button class="btn btn-primary btn-small" type="button" data-frame-action="try-live">
            <i data-lucide="scan-face" aria-hidden="true"></i>
            <span>Try Live</span>
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
            <span>WhatsApp Enquiry</span>
          </button>
          <button class="text-button product-select ${selected ? "active" : ""}" type="button" data-frame-action="select">
            <i data-lucide="${selected ? "check-circle-2" : favorite ? "bookmark" : "plus"}" aria-hidden="true"></i>
            ${selected ? "Selected" : favorite ? "Favorite" : "Select"}
          </button>
        </div>
      </div>
    `;

    card.querySelector(".product-media").appendChild(image);
    commerce.grid.appendChild(card);
  });

  refreshIcons();
}

function makeSummaryItem(frame, compact = false) {
  const item = document.createElement("div");
  const image = document.createElement("img");
  const copy = document.createElement("div");
  const remove = document.createElement("button");

  item.className = "summary-item";
  image.alt = "";
  assignFrameImage(image, frame);

  copy.innerHTML = `
    <strong>${escapeHtml(frame.name)}</strong>
    <span>${escapeHtml(frame.brand)} | ${formatCurrency(frame.price)}</span>
  `;

  remove.type = "button";
  remove.className = "icon-button mini";
  remove.setAttribute("aria-label", `Remove ${frame.name}`);
  remove.innerHTML = `<i data-lucide="x" aria-hidden="true"></i>`;
  remove.addEventListener("click", () => {
    state.selectedFrameIds.delete(frame.id);
    renderAllFrameSurfaces();
  });

  item.append(image, copy);
  if (!compact) item.appendChild(remove);
  return item;
}

function renderFrameSummary() {
  const frames = getSelectedFrames();
  const costs = getTrialCosts();
  const countText = frames.length
    ? `${frames.length} frame${frames.length === 1 ? "" : "s"} selected`
    : "No frames selected";

  if (commerce.summary) commerce.summary.classList.toggle("home-highlight", frames.length > 1);
  if (commerce.summaryCount) commerce.summaryCount.textContent = countText;
  if (commerce.summaryTotal) commerce.summaryTotal.textContent = formatCurrency(costs.frameTotal);
  if (commerce.summaryFee) commerce.summaryFee.textContent = formatCurrency(costs.serviceFee);
  if (commerce.summaryDeposit) commerce.summaryDeposit.textContent = formatCurrency(costs.deposit);

  if (commerce.summaryItems) {
    commerce.summaryItems.innerHTML = "";
    if (!frames.length) {
      const empty = document.createElement("p");
      empty.className = "summary-empty";
      empty.textContent = "Select one or more frames to create a shortlist.";
      commerce.summaryItems.appendChild(empty);
    } else {
      frames.forEach((frame) => commerce.summaryItems.appendChild(makeSummaryItem(frame)));
    }
  }

  if (homeTrial.count) homeTrial.count.textContent = countText;
  if (homeTrial.frameTotal) homeTrial.frameTotal.textContent = formatCurrency(costs.frameTotal);
  if (homeTrial.fee) homeTrial.fee.textContent = formatCurrency(costs.serviceFee);
  if (homeTrial.deposit) homeTrial.deposit.textContent = formatCurrency(costs.deposit);
  if (homeTrial.total) homeTrial.total.textContent = formatCurrency(costs.estimate);

  if (homeTrial.selected) {
    homeTrial.selected.innerHTML = "";
    if (!frames.length) {
      const empty = document.createElement("p");
      empty.className = "summary-empty";
      empty.textContent = "Your selected frames will appear here.";
      homeTrial.selected.appendChild(empty);
    } else {
      frames.forEach((frame) => homeTrial.selected.appendChild(makeSummaryItem(frame, true)));
    }
  }

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

  if (tryOn.frameName) tryOn.frameName.textContent = frame.name;
  if (tryOn.frameCategory) tryOn.frameCategory.textContent = frame.category;
  if (tryOn.frameMeta) {
    tryOn.frameMeta.textContent = `${frame.brand} | ${frame.material} | ${formatCurrency(frame.price)}`;
  }

  getFrameImage(frame);
  renderFrameThumbs();
  renderProductGrid();
  drawTryOnFrame();
}

function stepFrame(direction) {
  const frames = getFilteredFrames();
  const selectedFrame = getSelectedFrame();
  const currentFilteredIndex = frames.findIndex((frame) => frame.id === selectedFrame.id);
  const nextFilteredIndex = currentFilteredIndex === -1
    ? 0
    : (currentFilteredIndex + direction + frames.length) % frames.length;
  const nextOriginalIndex = FRAME_CATALOG.findIndex((frame) => frame.id === frames[nextFilteredIndex].id);
  selectFrame(nextOriginalIndex);
}

function addFrameToSelection(id, showNote = true) {
  const frame = getFrameById(id);
  if (!frame) return false;

  if (state.selectedFrameIds.has(id)) {
    renderAllFrameSurfaces();
    return true;
  }

  if (state.selectedFrameIds.size >= MAX_HOME_TRIAL_FRAMES) {
    const message = `Select up to ${MAX_HOME_TRIAL_FRAMES} frames for home trial.`;
    if (commerce.note && showNote) commerce.note.textContent = message;
    if (homeTrial.note && showNote) homeTrial.note.textContent = message;
    return false;
  }

  state.selectedFrameIds.add(id);
  if (commerce.note && showNote) commerce.note.textContent = `${frame.name} added to your selection.`;
  if (homeTrial.note && showNote) homeTrial.note.textContent = "Home trial summary updated.";
  renderAllFrameSurfaces();
  return true;
}

function toggleFrameSelection(id) {
  if (state.selectedFrameIds.has(id)) {
    state.selectedFrameIds.delete(id);
  } else {
    addFrameToSelection(id, false);
  }
  renderAllFrameSurfaces();
}

function ensureAtLeastOneSelected() {
  if (state.selectedFrameIds.size) return;
  addFrameToSelection(getSelectedFrame().id, false);
}

function scrollToSection(selector) {
  const target = document.querySelector(selector);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resizeTryOnCanvas() {
  if (!tryOn.canvas) return;
  const rect = tryOn.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.round(rect.width * pixelRatio);
  const nextHeight = Math.round(rect.height * pixelRatio);

  if (tryOn.canvas.width !== nextWidth || tryOn.canvas.height !== nextHeight) {
    tryOn.canvas.width = nextWidth;
    tryOn.canvas.height = nextHeight;
  }
}

function getVideoDrawRect() {
  const canvas = tryOn.canvas;
  const video = tryOn.video;
  const canvasRatio = canvas.width / canvas.height;
  const videoRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : canvasRatio;

  if (videoRatio > canvasRatio) {
    const height = canvas.height;
    const width = height * videoRatio;
    return { x: (canvas.width - width) / 2, y: 0, width, height };
  }

  const width = canvas.width;
  const height = width / videoRatio;
  return { x: 0, y: (canvas.height - height) / 2, width, height };
}

function drawIdleCanvas(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#edf7ff");
  gradient.addColorStop(0.58, "#dbeafe");
  gradient.addColorStop(1, "#eff6ff");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.72;
  context.strokeStyle = "rgba(45, 119, 255, 0.22)";
  context.lineWidth = Math.max(2, width * 0.003);
  context.strokeRect(width * 0.08, height * 0.1, width * 0.84, height * 0.78);
  context.restore();
}

function normalizedLandmarkToCanvas(landmark, rect) {
  return {
    x: rect.x + (1 - landmark.x) * rect.width,
    y: rect.y + landmark.y * rect.height
  };
}

function getLandmarkPlacement(rect, image) {
  const landmarks = state.lastLandmarks;
  if (!landmarks || landmarks.length < 468) return null;

  const leftOuter = normalizedLandmarkToCanvas(landmarks[33], rect);
  const rightOuter = normalizedLandmarkToCanvas(landmarks[263], rect);
  const leftTemple = normalizedLandmarkToCanvas(landmarks[234] || landmarks[127], rect);
  const rightTemple = normalizedLandmarkToCanvas(landmarks[454] || landmarks[356], rect);
  const leftIris = normalizedLandmarkToCanvas(landmarks[468] || landmarks[33], rect);
  const rightIris = normalizedLandmarkToCanvas(landmarks[473] || landmarks[263], rect);

  const eyeCenter = {
    x: (leftIris.x + rightIris.x) / 2,
    y: (leftIris.y + rightIris.y) / 2
  };
  const eyeDistance = Math.hypot(rightOuter.x - leftOuter.x, rightOuter.y - leftOuter.y);
  const templeDistance = Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y);
  const frameWidth = Math.max(eyeDistance * 2.2, templeDistance * 1.08);
  const frameHeight = frameWidth * (image.naturalHeight / image.naturalWidth);
  const angle = Math.atan2(rightOuter.y - leftOuter.y, rightOuter.x - leftOuter.x);

  return {
    x: eyeCenter.x,
    y: eyeCenter.y + frameHeight * 0.04,
    width: frameWidth,
    height: frameHeight,
    angle
  };
}

function getManualPlacement(image) {
  const canvas = tryOn.canvas;
  const portrait = canvas.height > canvas.width;
  const width = canvas.width * (portrait ? 0.72 : 0.46);
  return {
    x: canvas.width / 2,
    y: canvas.height * (portrait ? 0.38 : 0.42),
    width,
    height: width * (image.naturalHeight / image.naturalWidth),
    angle: 0
  };
}

function drawFrameImage(context, image, placement) {
  context.save();
  context.translate(placement.x, placement.y);
  context.rotate(placement.angle);
  context.drawImage(
    image,
    -placement.width / 2,
    -placement.height / 2,
    placement.width,
    placement.height
  );
  context.restore();
}

function drawTryOnFrame() {
  if (!tryOn.canvas) return;
  resizeTryOnCanvas();

  const canvas = tryOn.canvas;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);

  const hasVideo = tryOn.video && tryOn.video.readyState >= 2 && tryOn.video.videoWidth;
  const rect = hasVideo ? getVideoDrawRect() : null;

  if (hasVideo) {
    context.save();
    context.translate(rect.x + rect.width, rect.y);
    context.scale(-1, 1);
    context.drawImage(
      tryOn.video,
      0,
      0,
      tryOn.video.videoWidth,
      tryOn.video.videoHeight,
      0,
      0,
      rect.width,
      rect.height
    );
    context.restore();
  } else {
    drawIdleCanvas(context, width, height);
  }

  const frame = getSelectedFrame();
  const entry = getFrameImage(frame);
  if (!entry.loaded || entry.failed) return;

  const placement = rect && state.lastLandmarks
    ? getLandmarkPlacement(rect, entry.image)
    : getManualPlacement(entry.image);

  if (placement) {
    drawFrameImage(context, entry.image, placement);
  }
}

function startRenderLoop() {
  if (state.rendering) return;
  state.rendering = true;

  const render = () => {
    drawTryOnFrame();
    if (state.active) {
      requestAnimationFrame(render);
      return;
    }
    state.rendering = false;
  };

  requestAnimationFrame(render);
}

async function setupFaceMesh() {
  if (state.faceMesh || state.faceMeshUnavailable) return;

  if (!window.FaceMesh) {
    state.faceMeshUnavailable = true;
    setPill(tryOn.trackingState, "move", "Manual overlay active", true);
    return;
  }

  try {
    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });

    faceMesh.onResults((results) => {
      const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
      state.lastLandmarks = landmarks || null;
      setPill(
        tryOn.trackingState,
        landmarks ? "badge-check" : "scan-face",
        landmarks ? "Face locked" : "Position face in frame",
        !landmarks
      );
    });

    state.faceMesh = faceMesh;
    setPill(tryOn.trackingState, "scan-face", "Face tracking loading", true);
  } catch (error) {
    state.faceMeshUnavailable = true;
    setPill(tryOn.trackingState, "move", "Manual overlay active", true);
  }
}

function startAnalysisLoop() {
  if (state.analysisRunning) return;
  state.analysisRunning = true;

  const analyze = async () => {
    if (!state.active) {
      state.analysisRunning = false;
      return;
    }

    if (state.faceMesh && !state.analyzing && tryOn.video.readyState >= 2) {
      state.analyzing = true;
      try {
        await state.faceMesh.send({ image: tryOn.video });
        state.trackingFailures = 0;
      } catch (error) {
        state.trackingFailures += 1;
        if (state.trackingFailures > 5) {
          state.faceMesh = null;
          state.faceMeshUnavailable = true;
          state.lastLandmarks = null;
          setPill(tryOn.trackingState, "move", "Manual overlay active", true);
        }
      } finally {
        state.analyzing = false;
      }
    }

    requestAnimationFrame(analyze);
  };

  requestAnimationFrame(analyze);
}

async function startCamera() {
  if (!tryOn.video || !tryOn.canvas) return;

  setPill(tryOn.cameraState, "loader", "Opening camera", true);
  setPill(tryOn.trackingState, "scan-face", "Tracking standby", true);

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera access is not available in this browser.");
    }

    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    state.stream = stream;
    tryOn.video.srcObject = stream;
    await tryOn.video.play();

    state.active = true;
    state.lastLandmarks = null;
    if (tryOn.cameraPanel) tryOn.cameraPanel.hidden = true;
    if (tryOn.captureButton) tryOn.captureButton.disabled = false;

    setPill(tryOn.cameraState, "camera", "Camera live");
    await setupFaceMesh();
    startRenderLoop();
    startAnalysisLoop();
  } catch (error) {
    state.active = false;
    drawTryOnFrame();
    setPill(tryOn.cameraState, "circle-alert", "Camera unavailable", true);
    setPill(tryOn.trackingState, "scan-face", "Tracking paused", true);

    if (tryOn.cameraPanel) {
      const title = tryOn.cameraPanel.querySelector("h3");
      const copy = tryOn.cameraPanel.querySelector("p");
      if (title) title.textContent = "Camera permission needed";
      if (copy) copy.textContent = "Enable camera permission in your browser, then try again. You can still book or WhatsApp the clinic below.";
      if (tryOn.cameraHelp) tryOn.cameraHelp.textContent = error.message || "Camera access was blocked.";
      tryOn.cameraPanel.hidden = false;
    }
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function canvasToJpegBlob(canvas, quality = 0.86) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Photo capture failed."));
      }
    }, "image/jpeg", quality);
  });
}

async function capturePhoto() {
  if (!tryOn.canvas) return;
  if (!state.active) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Open the camera before capturing your try-on.";
    return;
  }

  drawTryOnFrame();

  try {
    const blob = await canvasToJpegBlob(tryOn.canvas, 0.86);
    const timestamp = new Date();
    const safeStamp = timestamp.toISOString().replace(/[:.]/g, "-");
    const filename = `vision-vistara-tryon-${safeStamp}.jpg`;

    if (state.capturedObjectUrl) {
      URL.revokeObjectURL(state.capturedObjectUrl);
    }

    state.capturedBlob = blob;
    state.capturedFile = new File([blob], filename, { type: "image/jpeg" });
    state.capturedDataUrl = await blobToDataUrl(blob);
    state.capturedObjectUrl = URL.createObjectURL(blob);
    state.lastCaptureName = filename;

    if (tryOn.previewImage) tryOn.previewImage.src = state.capturedDataUrl;
    if (tryOn.previewPanel) tryOn.previewPanel.hidden = false;
    if (tryOn.downloadButton) tryOn.downloadButton.disabled = false;
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Photo captured. Add your details and send it to WhatsApp.";
  } catch (error) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Photo capture failed. Please try again.";
  }
}

function downloadCapture() {
  if (!state.capturedBlob) return;
  const link = document.createElement("a");
  link.href = state.capturedObjectUrl || URL.createObjectURL(state.capturedBlob);
  link.download = state.lastCaptureName || "vision-vistara-tryon.jpg";
  link.click();
}

function retakeCapture() {
  state.capturedBlob = null;
  state.capturedFile = null;
  state.capturedDataUrl = "";
  state.lastCaptureName = "";

  if (state.capturedObjectUrl) {
    URL.revokeObjectURL(state.capturedObjectUrl);
    state.capturedObjectUrl = "";
  }

  if (tryOn.previewPanel) tryOn.previewPanel.hidden = true;
  if (tryOn.previewImage) tryOn.previewImage.removeAttribute("src");
  if (tryOn.downloadButton) tryOn.downloadButton.disabled = true;
  if (tryOn.leadNote) tryOn.leadNote.textContent = "Ready for another capture.";
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function compactFileName(file) {
  return file && file.name ? file.name : "";
}

function getFrameSummaryLines(frames) {
  if (!frames.length) return ["Selected frames: Not selected"];
  return [
    "Selected frames:",
    ...frames.map((frame, index) => `${index + 1}. ${frame.name} - ${frame.brand} - ${formatCurrency(frame.price)}`)
  ];
}

function buildWhatsAppText(lead) {
  const frames = lead.selectedFrames || [];
  const lines = [
    "Hello Vision Vistara Optics & Lasers Eye Care,",
    "",
    `Request: ${lead.intent || lead.service || "Frame enquiry"}`,
    `Patient name: ${lead.name || "Not provided"}`,
    `Phone: ${lead.phone || "Not provided"}`,
    lead.location ? `Location: ${lead.location}` : "",
    lead.address ? `Address: ${lead.address}` : "",
    lead.bookingDate ? `Preferred date: ${lead.bookingDate}` : "",
    lead.bookingTime ? `Preferred time: ${lead.bookingTime}` : "",
    "",
    ...getFrameSummaryLines(frames),
    frames.length ? `Frame total: ${formatCurrency(lead.frameTotal)}` : "",
    lead.serviceFee !== undefined ? `Try-at-home fee: ${formatCurrency(lead.serviceFee)}` : "",
    lead.deposit !== undefined ? `Refundable deposit: ${formatCurrency(lead.deposit)}` : "",
    lead.photoIncluded ? "Photo preview: Captured in browser. I can attach or share it from my phone." : "",
    lead.prescriptionFile ? `Prescription file: ${lead.prescriptionFile}` : "",
    lead.selfieFile ? `Selfie file: ${lead.selfieFile}` : "",
    lead.message ? `Message: ${lead.message}` : "",
    `Source: ${lead.source || "website"}`,
    `Submitted at: ${new Date(lead.timestamp).toLocaleString()}`
  ].filter(Boolean);

  return lines.join("\n");
}

function buildWhatsAppUrl(text) {
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function getLeads() {
  const leads = getStoredJson(LEAD_STORAGE_KEY, []);
  return Array.isArray(leads) ? leads : [];
}

function saveLeads(leads) {
  setStoredJson(LEAD_STORAGE_KEY, leads.slice(0, MAX_LOCAL_LEADS));
}

function upsertLead(lead) {
  const leads = getLeads().filter((item) => item.id !== lead.id);
  leads.unshift(lead);
  saveLeads(leads);
  renderDashboard();
}

function updateLeadStatus(id, status) {
  const leads = getLeads().map((lead) => (
    lead.id === id ? { ...lead, status } : lead
  ));
  saveLeads(leads);
  renderDashboard();
}

function makeLead(payload) {
  const frames = payload.selectedFrames || getSelectedFrames();
  const frameTotal = frames.reduce((sum, frame) => sum + frame.price, 0);
  return {
    id: `vv-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    status: "new",
    selectedFrames: frames.map((frame) => ({
      id: frame.id,
      name: frame.name,
      brand: frame.brand,
      category: frame.category,
      material: frame.material,
      price: frame.price,
      file: frame.file
    })),
    frameTotal,
    ...payload
  };
}

async function submitLeadToBackend(lead, blob) {
  const formData = new FormData();
  formData.append("name", lead.name);
  formData.append("phone", lead.phone);
  formData.append("location", lead.location || "");
  formData.append("selectedFrames", JSON.stringify(lead.selectedFrames || []));
  formData.append("frameTotal", String(lead.frameTotal || 0));
  formData.append("timestamp", lead.timestamp);
  formData.append("source", lead.source || "website");
  formData.append("service", lead.service || "");
  formData.append("intent", lead.intent || "");
  formData.append("status", lead.status);
  if (blob) {
    formData.append("image", blob, lead.filename || "vision-vistara-tryon.jpg");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(BACKEND_LEAD_ENDPOINT, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return await response.json().catch(() => ({ ok: true }));
  } finally {
    window.clearTimeout(timeout);
  }
}

async function shareOrOpenWhatsApp(lead) {
  const text = buildWhatsAppText(lead);

  if (
    state.capturedFile &&
    navigator.canShare &&
    navigator.share &&
    navigator.canShare({ files: [state.capturedFile] })
  ) {
    try {
      await navigator.share({
        title: "Vision Vistara virtual try-on",
        text,
        files: [state.capturedFile]
      });
      if (tryOn.leadNote) tryOn.leadNote.textContent = "Shared successfully. The lead is saved in the clinic dashboard.";
      return;
    } catch (error) {
      if (error.name === "AbortError" && tryOn.leadNote) {
        tryOn.leadNote.textContent = "Share cancelled. Opening WhatsApp text fallback.";
      }
    }
  }

  window.open(buildWhatsAppUrl(text), "_blank", "noopener");
  if (tryOn.leadNote) {
    tryOn.leadNote.textContent = "WhatsApp opened with lead details. Download the photo if you want to attach it manually.";
  }
}

function openWhatsAppForLead(lead) {
  upsertLead(lead);
  window.open(buildWhatsAppUrl(buildWhatsAppText(lead)), "_blank", "noopener");
}

function rememberContact(form) {
  if (!form) return;
  const data = new FormData(form);
  const previous = getStoredJson(CONTACT_STORAGE_KEY, {});
  const next = {
    ...previous,
    name: String(data.get("name") || previous.name || "").trim(),
    phone: String(data.get("phone") || previous.phone || "").trim(),
    email: String(data.get("email") || previous.email || "").trim(),
    location: String(data.get("location") || previous.location || "").trim(),
    address: String(data.get("address") || previous.address || "").trim()
  };
  setStoredJson(CONTACT_STORAGE_KEY, next);
}

function hydrateContactForm(form) {
  if (!form) return;
  const saved = getStoredJson(CONTACT_STORAGE_KEY, {});
  ["name", "phone", "email", "location", "address"].forEach((name) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input && saved[name] && !input.value) {
      input.value = saved[name];
    }
  });

  form.addEventListener("input", () => rememberContact(form));
}

async function handleLeadSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!state.capturedBlob || !state.capturedDataUrl) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Capture your try-on photo before sending.";
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
  const lead = makeLead({
    name,
    phone,
    location,
    selectedFrames: [frame],
    intent: "Virtual try-on follow-up",
    service: "Virtual Try-On",
    source: "virtual try-on",
    status: "try-on-done",
    imageUrl: state.capturedDataUrl,
    photoIncluded: true,
    prescriptionFile,
    filename: state.lastCaptureName || "vision-vistara-tryon.jpg"
  });

  upsertLead(lead);
  if (tryOn.leadNote) tryOn.leadNote.textContent = "Saving lead and checking backend messaging...";

  try {
    const backend = await submitLeadToBackend(lead, state.capturedBlob);
    const backendLead = {
      ...lead,
      backendId: backend.id || backend.leadId || "",
      imageUrl: backend.imageUrl || lead.imageUrl,
      deliveryStatus: backend.deliveryStatus || "sent"
    };
    upsertLead(backendLead);

    if (backend.whatsappUrl) {
      window.open(backend.whatsappUrl, "_blank", "noopener");
    } else {
      await shareOrOpenWhatsApp(backendLead);
    }

    if (tryOn.leadNote) {
      tryOn.leadNote.textContent = "Lead saved in the dashboard and sent for WhatsApp follow-up.";
    }
  } catch (error) {
    if (tryOn.leadNote) {
      tryOn.leadNote.textContent = "Backend is not connected. Using WhatsApp fallback.";
    }
    await shareOrOpenWhatsApp(lead);
  }
}

function handleCommerceLeadSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  ensureAtLeastOneSelected();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const phone = normalizePhone(data.get("phone"));
  const location = String(data.get("location") || "").trim();
  const intent = event.submitter && event.submitter.value ? event.submitter.value : "WhatsApp Enquiry";

  if (!isValidPhone(phone)) {
    if (commerce.note) commerce.note.textContent = "Please enter a valid mobile number.";
    return;
  }

  rememberContact(form);
  const costs = getTrialCosts();
  const lead = makeLead({
    name,
    phone,
    location,
    intent,
    service: intent,
    source: "frame selection summary",
    status: intent === "Try At Home" ? "home-trial-booked" : "frame-selected",
    serviceFee: intent === "Try At Home" ? costs.serviceFee : undefined,
    deposit: intent === "Try At Home" ? costs.deposit : undefined
  });

  openWhatsAppForLead(lead);
  if (commerce.note) commerce.note.textContent = "WhatsApp opened with the selected frame details.";
}

function handleHomeTrialSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  ensureAtLeastOneSelected();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const phone = normalizePhone(data.get("phone"));
  const address = String(data.get("address") || "").trim();
  const bookingDate = String(data.get("date") || "").trim();
  const bookingTime = String(data.get("time") || "").trim();
  const selfieFile = compactFileName(data.get("selfie"));
  const prescriptionFile = compactFileName(data.get("prescription"));

  if (!isValidPhone(phone)) {
    if (homeTrial.note) homeTrial.note.textContent = "Please enter a valid mobile number.";
    return;
  }

  rememberContact(form);
  const costs = getTrialCosts();
  const lead = makeLead({
    name,
    phone,
    address,
    bookingDate,
    bookingTime,
    selfieFile,
    prescriptionFile,
    intent: "Try At Home",
    service: "Try At Home",
    source: "try-at-home booking",
    status: "home-trial-booked",
    serviceFee: costs.serviceFee,
    deposit: costs.deposit
  });

  openWhatsAppForLead(lead);
  if (homeTrial.note) homeTrial.note.textContent = "Home-trial request saved and opened in WhatsApp.";
}

function openQuickFrameWhatsApp(frame, intent) {
  addFrameToSelection(frame.id, false);
  const costs = getTrialCosts();
  const lead = makeLead({
    name: "Website visitor",
    phone: "",
    intent,
    service: intent,
    source: "frame catalog",
    status: intent === "Buy Now" ? "payment-pending" : "frame-selected",
    serviceFee: intent === "Try At Home" ? costs.serviceFee : undefined,
    deposit: intent === "Try At Home" ? costs.deposit : undefined
  });

  window.open(buildWhatsAppUrl(buildWhatsAppText(lead)), "_blank", "noopener");
}

function renderDashboard() {
  if (!dashboard.list) return;

  const query = (dashboard.search && dashboard.search.value ? dashboard.search.value : "").trim().toLowerCase();
  const status = dashboard.status ? dashboard.status.value : "all";

  const leads = getLeads().filter((lead) => {
    const statusMatch = status === "all" || lead.status === status;
    const frameNames = (lead.selectedFrames || []).map((frame) => frame.name).join(" ");
    const haystack = [
      lead.name,
      lead.phone,
      lead.email,
      lead.location,
      lead.address,
      lead.service,
      lead.intent,
      lead.source,
      frameNames,
      lead.bookingDate,
      lead.bookingTime,
      lead.timestamp
    ].join(" ").toLowerCase();
    return statusMatch && (!query || haystack.includes(query));
  });

  dashboard.list.innerHTML = "";

  if (!leads.length) {
    const empty = document.createElement("div");
    empty.className = "dashboard-empty";
    empty.textContent = "No frame, try-on, home-trial, or appointment leads match this view yet.";
    dashboard.list.appendChild(empty);
    return;
  }

  leads.forEach((lead) => {
    const card = document.createElement("article");
    const image = document.createElement("img");
    const meta = document.createElement("div");
    const actions = document.createElement("div");
    const statusSelect = document.createElement("select");
    const whatsapp = document.createElement("a");
    const frames = lead.selectedFrames || [];
    const firstFrame = frames[0] && getFrameById(frames[0].id);

    card.className = "dashboard-card";
    image.alt = `${lead.name || "Patient"} preview`;
    if (lead.imageUrl) {
      image.src = lead.imageUrl;
    } else if (firstFrame) {
      assignFrameImage(image, firstFrame);
    } else {
      image.src = "assets/vision-vistara-eye-logo.png";
    }

    const frameLabel = frames.length
      ? frames.map((frame) => `${frame.name} (${formatCurrency(frame.price)})`).join(", ")
      : "No frame selected";

    meta.className = "lead-meta";
    meta.innerHTML = `
      <div class="lead-title-row">
        <h3>${escapeHtml(lead.name || "Website visitor")}</h3>
        <span>${escapeHtml(getStatusLabel(lead.status))}</span>
      </div>
      <p>${escapeHtml(lead.phone || "Phone not captured")}${lead.location ? ` | ${escapeHtml(lead.location)}` : ""}</p>
      <p>${escapeHtml(frameLabel)}</p>
      <small>${escapeHtml(lead.service || lead.intent || "Lead")} | ${escapeHtml(new Date(lead.timestamp).toLocaleString())}</small>
      ${lead.bookingDate ? `<small>${escapeHtml(lead.bookingDate)}${lead.bookingTime ? ` | ${escapeHtml(lead.bookingTime)}` : ""}</small>` : ""}
    `;

    actions.className = "lead-actions";
    STATUS_OPTIONS.forEach(([optionValue, label]) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = label;
      option.selected = lead.status === optionValue;
      statusSelect.appendChild(option);
    });
    statusSelect.setAttribute("aria-label", `Status for ${lead.name || "lead"}`);
    statusSelect.addEventListener("change", () => updateLeadStatus(lead.id, statusSelect.value));

    whatsapp.href = buildWhatsAppUrl(buildWhatsAppText(lead));
    whatsapp.target = "_blank";
    whatsapp.rel = "noopener";
    whatsapp.innerHTML = `<i data-lucide="message-circle" aria-hidden="true"></i>Follow up`;

    actions.append(statusSelect, whatsapp);
    card.append(image, meta, actions);
    dashboard.list.appendChild(card);
  });

  refreshIcons();
}

function setupAppointmentForm() {
  if (!appointmentForm) return;

  const dateInput = appointmentForm.querySelector('input[name="date"]');
  const note = appointmentForm.querySelector("[data-form-note]");

  hydrateContactForm(appointmentForm);

  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }

  appointmentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!appointmentForm.checkValidity()) {
      appointmentForm.reportValidity();
      return;
    }

    const data = new FormData(appointmentForm);
    const name = String(data.get("name") || "").trim();
    const phone = normalizePhone(data.get("phone"));
    const service = String(data.get("service") || "").trim();
    const date = String(data.get("date") || "").trim();
    const time = String(data.get("time") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!isValidPhone(phone)) {
      if (note) note.textContent = "Please enter a valid phone number.";
      return;
    }

    rememberContact(appointmentForm);

    const lead = makeLead({
      name,
      phone,
      service,
      intent: "Appointment request",
      source: "appointment form",
      status: "booked",
      bookingDate: date || "",
      bookingTime: time || "",
      message
    });

    upsertLead(lead);

    if (note) {
      note.textContent = "Opening WhatsApp with your appointment request...";
    }

    window.open(buildWhatsAppUrl(buildWhatsAppText(lead)), "_blank", "noopener");
  });
}

function setupTouchFrameSwipe() {
  if (!tryOn.viewport) return;

  let startX = 0;
  let startY = 0;

  tryOn.viewport.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  tryOn.viewport.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      stepFrame(deltaX < 0 ? 1 : -1);
    }
  }, { passive: true });
}

function setupRevealAnimations() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = document.querySelectorAll(
    ".section-heading, .section-copy, .tryon-shell, .commerce-layout, .service-grid article, .trust-grid article, .diagnostic-grid article, .testimonial-grid article, .doctor-profile, .dashboard-controls, .home-trial-form, .home-summary-panel, .faq-list details"
  );

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("revealed"));
    return;
  }

  revealItems.forEach((item) => item.setAttribute("data-reveal", ""));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => observer.observe(item));
}

function setupNavigation() {
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMenu(!isOpen);
    });
  }

  if (mobileMenu) {
    mobileMenu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        setMenu(false);
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
    }
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  if (hero && mobileStickyActions && "IntersectionObserver" in window) {
    const stickyObserver = new IntersectionObserver(([entry]) => {
      mobileStickyActions.classList.toggle("is-visible", !entry.isIntersecting);
    }, { threshold: 0.12 });

    stickyObserver.observe(hero);
  }
}

function setupTryOn() {
  if (!tryOn.canvas) return;

  renderAllFrameSurfaces();
  selectFrame(0);
  drawTryOnFrame();

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(drawTryOnFrame);
    resizeObserver.observe(tryOn.canvas);
  } else {
    window.addEventListener("resize", drawTryOnFrame);
  }

  tryOn.startButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = event.currentTarget;
      if (target.matches("[data-open-tryon]")) {
        event.preventDefault();
        scrollToSection("#tryon");
      }
      startCamera();
    });
  });

  if (tryOn.prevButton) tryOn.prevButton.addEventListener("click", () => stepFrame(-1));
  if (tryOn.nextButton) tryOn.nextButton.addEventListener("click", () => stepFrame(1));
  if (tryOn.captureButton) tryOn.captureButton.addEventListener("click", capturePhoto);
  if (tryOn.retakeButton) tryOn.retakeButton.addEventListener("click", retakeCapture);
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
      const frame = getSelectedFrame();
      addFrameToSelection(frame.id);
      scrollToSection("#home-trial");
    });
  }
  if (tryOn.leadForm) {
    hydrateContactForm(tryOn.leadForm);
    tryOn.leadForm.addEventListener("submit", handleLeadSubmit);
  }

  setupTouchFrameSwipe();
}

function setupCommerce() {
  if (commerce.search) commerce.search.addEventListener("input", renderProductGrid);

  if (commerce.grid) {
    commerce.grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-frame-action]");
      const card = event.target.closest("[data-frame-id]");
      if (!button || !card) return;

      const frame = getFrameById(card.dataset.frameId);
      if (!frame) return;
      const index = FRAME_CATALOG.findIndex((item) => item.id === frame.id);
      const action = button.dataset.frameAction;

      if (action === "select") {
        toggleFrameSelection(frame.id);
      } else if (action === "try-live") {
        selectFrame(index);
        addFrameToSelection(frame.id, false);
        scrollToSection("#tryon");
        startCamera();
      } else if (action === "try-home") {
        addFrameToSelection(frame.id);
        scrollToSection("#home-trial");
      } else if (action === "buy-now") {
        openQuickFrameWhatsApp(frame, "Buy Now");
      } else if (action === "whatsapp") {
        openQuickFrameWhatsApp(frame, "WhatsApp Enquiry");
      }
    });
  }

  if (commerce.clearButton) {
    commerce.clearButton.addEventListener("click", () => {
      state.selectedFrameIds.clear();
      if (commerce.note) commerce.note.textContent = "Selection cleared. Choose the frames you want to compare.";
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

function setupDashboard() {
  if (dashboard.search) dashboard.search.addEventListener("input", renderDashboard);
  if (dashboard.status) dashboard.status.addEventListener("change", renderDashboard);
  renderDashboard();
}

setupNavigation();
setupTryOn();
setupCommerce();
setupHomeTrial();
setupAppointmentForm();
setupDashboard();
setupRevealAnimations();
refreshIcons();
