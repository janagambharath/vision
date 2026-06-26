const CLINIC_WHATSAPP_NUMBER = "917842938316";
const BACKEND_LEAD_ENDPOINT = "/api/tryon-leads";
const LEAD_STORAGE_KEY = "visionVistara.tryOnLeads.v2";
const CONTACT_STORAGE_KEY = "visionVistara.contact.v2";
const MAX_LOCAL_LEADS = 35;
const MAX_HOME_TRIAL_FRAMES = 5;
const HOME_TRIAL_BASE_FEE = 199;
const HOME_TRIAL_FREE_THRESHOLD = 7000;
const HOME_TRIAL_DEPOSIT = 500;
const AI_TRYON_ENDPOINT = "/api/ai-tryon";
const FREE_AI_IMAGE_MODEL = "free-stable-diffusion-inpaint";

const FRAME_CATEGORY_OPTIONS = [
  "Men",
  "Women",
  "Premium",
  "Titanium",
  "Transparent",
  "Round",
  "Square",
  "Full Rim"
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
    id: "supersight-b-titanium-6009",
    sku: "6009",
    name: "B-Titanium IP 6009",
    brand: "Supersight Evelicar",
    category: "Titanium",
    categories: ["Men", "Women", "Premium", "Titanium", "Round", "Full Rim"],
    material: "B-Titanium",
    shape: "Round",
    size: "46-21-140",
    colour: "Gloss Black",
    availability: "In stock",
    price: null,
    priceLabel: "Price on request",
    description: "Real Vision Vistara inventory frame with black B-Titanium styling, visible nose pads, printed lens markings, and Supersight branding.",
    file: "assets/inventory/supersight-b-titanium-6009/front.png",
    arFile: "assets/inventory/supersight-b-titanium-6009/ar-front.png",
    detailImages: [
      { label: "Front View", file: "assets/inventory/supersight-b-titanium-6009/front.png" }
    ],
    pendingViews: ["45 deg Left", "45 deg Right", "Left Side", "Right Side", "Close-up Hinge", "Brand Logo Detail"],
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
    categories: ["Women", "Premium", "Transparent", "Square", "Full Rim"],
    material: "Material to confirm in clinic",
    shape: "Square",
    size: "49D17-142",
    colour: "Transparent Pink",
    availability: "In stock",
    price: null,
    priceLabel: "Price on request",
    description: "Real Vision Vistara inventory frame with transparent pink full-rim styling, visible 96409 49D17-142 marking, and Suphous Eyewear logo.",
    file: "assets/inventory/suphous-pink-96409/front.png",
    arFile: "assets/inventory/suphous-pink-96409/ar-front.png",
    hoverFile: "assets/inventory/suphous-pink-96409/left45.png",
    detailImages: [
      { label: "Front View", file: "assets/inventory/suphous-pink-96409/front.png" },
      { label: "45 deg Left", file: "assets/inventory/suphous-pink-96409/left45.png" }
    ],
    pendingViews: ["45 deg Right", "Left Side", "Right Side", "Close-up Hinge", "Brand Logo Detail"],
    measurements: "49D17-142",
    suitableFaceShapes: "Oval, round, and heart face shapes after in-clinic fit check.",
    lensCompatibility: "Prescription lenses, anti-reflective coating, photochromic lenses, and blue-light lenses after prescription verification."
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
  openButtons: document.querySelectorAll("[data-open-tryon]"),
  selfieInput: document.querySelector("[data-selfie-input]"),
  generateButton: document.querySelector("[data-generate-tryon]"),
  aiState: document.querySelector("[data-ai-state]"),
  uploadState: document.querySelector("[data-upload-state]"),
  beforeImage: document.querySelector("[data-before-img]"),
  beforePlaceholder: document.querySelector("[data-before-placeholder]"),
  resultPlaceholder: document.querySelector("[data-result-placeholder]"),
  frameName: document.querySelector("[data-frame-name]"),
  frameCategory: document.querySelector("[data-frame-category]"),
  frameMeta: document.querySelector("[data-frame-meta]"),
  categoryList: document.querySelector("[data-frame-categories]"),
  thumbs: document.querySelector("[data-frame-thumbs]"),
  prevButton: document.querySelector("[data-prev-frame]"),
  nextButton: document.querySelector("[data-next-frame]"),
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
  selfieFile: null,
  selfieDataUrl: "",
  aiBusy: false,
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function hasNumericPrice(frame) {
  return frame && typeof frame.price === "number" && Number.isFinite(frame.price);
}

function getFramePrice(frame) {
  return hasNumericPrice(frame) ? frame.price : 0;
}

function getFramePriceLabel(frame) {
  return hasNumericPrice(frame) ? formatCurrency(frame.price) : frame.priceLabel || "Price on request";
}

function getFrameTotalLabel(frames = getSelectedFrames()) {
  if (!frames.length) return formatCurrency(0);
  const total = frames.reduce((sum, frame) => sum + getFramePrice(frame), 0);
  const hasUnknownPrice = frames.some((frame) => !hasNumericPrice(frame));
  if (hasUnknownPrice && total === 0) return "Price on request";
  if (hasUnknownPrice) return `${formatCurrency(total)} + on request`;
  return formatCurrency(total);
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
  return getSelectedFrames().reduce((sum, frame) => sum + getFramePrice(frame), 0);
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

function getImageSrc(frame, purpose = "catalog") {
  if (!frame) return "";
  if (purpose === "ar") return frame.arFile || "";
  if (purpose === "hover") return frame.hoverFile || frame.file || "";
  return frame.file || "";
}

function assignFrameImage(img, frame, purpose = "catalog") {
  const src = getImageSrc(frame, purpose);
  if (!src) {
    img.hidden = true;
    return;
  }
  img.hidden = false;
  img.src = src;
  img.onerror = () => {
    img.hidden = true;
    img.removeAttribute("src");
  };
}

function getFilteredFrames() {
  const categoryMatch = (frame) => (
    state.selectedCategory === "All" ||
    frame.category === state.selectedCategory ||
    frame.categories.includes(state.selectedCategory)
  );
  return FRAME_CATALOG.filter(categoryMatch);
}

function getAvailableCategories() {
  const available = new Set();
  FRAME_CATALOG.forEach((frame) => {
    frame.categories.forEach((category) => available.add(category));
  });
  return FRAME_CATEGORY_OPTIONS
    .filter((category) => available.has(category))
    .concat(Array.from(available).filter((category) => !FRAME_CATEGORY_OPTIONS.includes(category)));
}

function getCatalogFrames() {
  const query = (commerce.search && commerce.search.value ? commerce.search.value : "").trim().toLowerCase();
  return getFilteredFrames().filter((frame) => {
    if (!query) return true;
    return [
      frame.sku,
      frame.name,
      frame.brand,
      frame.category,
      frame.material,
      frame.shape,
      frame.size,
      frame.colour,
      frame.availability,
      frame.description,
      frame.measurements,
      frame.lensCompatibility,
      frame.suitableFaceShapes,
      ...frame.categories
    ].join(" ").toLowerCase().includes(query);
  });
}

function renderTryOnCategories() {
  if (!tryOn.categoryList) return;
  const categories = ["All", ...getAvailableCategories()];
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
  const categories = ["All", ...getAvailableCategories()];
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
    meta.textContent = `${frame.category} | ${getFramePriceLabel(frame)}`;

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
    const hoverImage = frame.hoverFile ? document.createElement("img") : null;
    const selected = state.selectedFrameIds.has(frame.id);
    const favorite = state.favoriteFrameIds.has(frame.id);
    const detailImages = frame.detailImages || [];
    const pendingViews = frame.pendingViews || [];

    card.className = "product-card";
    if (hoverImage) card.classList.add("has-hover");
    card.dataset.frameId = frame.id;

    image.alt = `${frame.brand} ${frame.name} front view`;
    image.className = "product-main-image";
    assignFrameImage(image, frame);
    if (hoverImage) {
      hoverImage.alt = `${frame.brand} ${frame.name} 45 degree view`;
      hoverImage.className = "product-hover-image";
      assignFrameImage(hoverImage, frame, "hover");
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
            <em>${escapeHtml(frame.availability || "Availability on request")}</em>
          </div>
        </div>
        <div class="product-tags">
          ${frame.categories.slice(0, 4).map((category) => `<span>${escapeHtml(category)}</span>`).join("")}
        </div>
        <p>${escapeHtml(frame.description)}</p>
        <dl class="product-specs">
          <div><dt>Brand</dt><dd>${escapeHtml(frame.brand)}</dd></div>
          <div><dt>Material</dt><dd>${escapeHtml(frame.material)}</dd></div>
          <div><dt>Shape</dt><dd>${escapeHtml(frame.shape || frame.category)}</dd></div>
          <div><dt>Size</dt><dd>${escapeHtml(frame.size || frame.measurements || "Fit check required")}</dd></div>
          <div><dt>Colour</dt><dd>${escapeHtml(frame.colour || "As photographed")}</dd></div>
          <div><dt>Availability</dt><dd>${escapeHtml(frame.availability || "On request")}</dd></div>
        </dl>
        <details class="frame-detail">
          <summary>Product details</summary>
          <div class="detail-gallery">
            ${detailImages.map((item) => `
              <figure>
                <img src="${escapeHtml(item.file)}" alt="${escapeHtml(frame.brand)} ${escapeHtml(frame.name)} ${escapeHtml(item.label)}">
                <figcaption>${escapeHtml(item.label)}</figcaption>
              </figure>
            `).join("")}
          </div>
          <dl class="detail-specs">
            <div><dt>SKU</dt><dd>${escapeHtml(frame.sku || frame.id)}</dd></div>
            <div><dt>Measurements</dt><dd>${escapeHtml(frame.measurements || frame.size || "Fit check required")}</dd></div>
            <div><dt>Suitable face shapes</dt><dd>${escapeHtml(frame.suitableFaceShapes || "Confirm during clinic fitting")}</dd></div>
            <div><dt>Lens compatibility</dt><dd>${escapeHtml(frame.lensCompatibility || "Confirm during prescription check")}</dd></div>
          </dl>
          ${pendingViews.length ? `<p class="detail-note">Pending real inventory photos: ${pendingViews.map(escapeHtml).join(", ")}.</p>` : ""}
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

    card.querySelector(".product-media").append(image, ...(hoverImage ? [hoverImage] : []));
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
    <span>${escapeHtml(frame.brand)} | ${escapeHtml(getFramePriceLabel(frame))}</span>
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
  if (commerce.summaryTotal) commerce.summaryTotal.textContent = getFrameTotalLabel(frames);
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
  if (homeTrial.frameTotal) homeTrial.frameTotal.textContent = getFrameTotalLabel(frames);
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
  state.smoothedPlacement = null;

  if (tryOn.frameName) tryOn.frameName.textContent = frame.name;
  if (tryOn.frameCategory) tryOn.frameCategory.textContent = frame.category;
  if (tryOn.frameMeta) {
    tryOn.frameMeta.textContent = `${frame.brand} | ${frame.material} | ${getFramePriceLabel(frame)}`;
  }

  renderFrameThumbs();
  renderProductGrid();
  if (tryOn.leadNote && state.selfieFile && !state.capturedDataUrl) {
    tryOn.leadNote.textContent = `${frame.name} selected. Generate the AI try-on when ready.`;
  }
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

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

function setTryOnBusy(busy, message = "") {
  state.aiBusy = busy;
  if (tryOn.generateButton) tryOn.generateButton.disabled = busy || !state.selfieFile;
  if (tryOn.aiState) {
    setPill(tryOn.aiState, busy ? "loader" : "sparkles", message || (busy ? "Generating preview" : "AI try-on ready"), busy);
  }
}

function buildTryOnPrompt(frame) {
  return [
    "Create a realistic optical eyewear try-on image from the uploaded selfie.",
    "Preserve the person's identity, face shape, skin tone, hair, age, expression, beard or makeup, and natural proportions.",
    `Apply the exact real inventory frame: ${frame.brand} ${frame.name}.`,
    `Frame details: ${frame.colour}, ${frame.shape}, ${frame.material}, size ${frame.size || frame.measurements}.`,
    "Preserve exact frame geometry, color, thickness, lens opening, markings, and branding from the provided frame image.",
    "Do not redesign the frame. Do not invent a new eyewear product. Do not beautify or change the person.",
    "Place the frame naturally on the face as a premium optical ecommerce try-on preview."
  ].join(" ");
}

async function submitAiTryOnToFreeModel(frame) {
  const formData = new FormData();
  formData.append("model", FREE_AI_IMAGE_MODEL);
  formData.append("prompt", buildTryOnPrompt(frame));
  formData.append("selfie", state.selfieFile, state.selfieFile.name || "selfie.jpg");
  formData.append("frameId", frame.id);
  formData.append("frameName", frame.name);
  formData.append("frameImageUrl", new URL(frame.file, window.location.href).href);
  formData.append("frameArUrl", new URL(frame.arFile || frame.file, window.location.href).href);

  const response = await fetch(AI_TRYON_ENDPOINT, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`AI try-on endpoint returned ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json();
    if (payload.dataUrl) return payload.dataUrl;
    if (payload.imageUrl) return payload.imageUrl;
    throw new Error("AI try-on response did not include an image.");
  }

  const blob = await response.blob();
  return await blobToDataUrl(blob);
}

async function createLocalTryOnPreview(frame) {
  const selfie = await loadImage(state.selfieDataUrl);
  const frameImage = await loadImage(frame.arFile || frame.file);
  const canvas = document.createElement("canvas");
  const maxWidth = 1200;
  const ratio = Math.min(1, maxWidth / selfie.naturalWidth);
  canvas.width = Math.round(selfie.naturalWidth * ratio);
  canvas.height = Math.round(selfie.naturalHeight * ratio);
  const context = canvas.getContext("2d");
  context.drawImage(selfie, 0, 0, canvas.width, canvas.height);

  const portrait = canvas.height >= canvas.width;
  const frameWidth = canvas.width * (portrait ? 0.54 : 0.4);
  const frameHeight = frameWidth * (frameImage.naturalHeight / frameImage.naturalWidth);
  const x = (canvas.width - frameWidth) / 2;
  const y = canvas.height * (portrait ? 0.31 : 0.34);

  context.save();
  context.globalAlpha = 0.96;
  context.shadowColor = "rgba(0, 0, 0, 0.22)";
  context.shadowBlur = Math.max(6, frameWidth * 0.018);
  context.shadowOffsetY = Math.max(2, frameHeight * 0.02);
  context.drawImage(frameImage, x, y, frameWidth, frameHeight);
  context.restore();

  return await new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Local try-on preview failed."));
        return;
      }
      resolve({
        blob,
        dataUrl: await blobToDataUrl(blob)
      });
    }, "image/jpeg", 0.9);
  });
}

function showTryOnResult(dataUrl, blob = null, source = "ai") {
  const timestamp = new Date();
  const safeStamp = timestamp.toISOString().replace(/[:.]/g, "-");
  const filename = `vision-vistara-ai-tryon-${safeStamp}.jpg`;

  if (state.capturedObjectUrl) {
    URL.revokeObjectURL(state.capturedObjectUrl);
  }

  state.capturedBlob = blob;
  state.capturedDataUrl = dataUrl;
  state.capturedObjectUrl = blob ? URL.createObjectURL(blob) : "";
  state.capturedFile = blob ? new File([blob], filename, { type: "image/jpeg" }) : null;
  state.lastCaptureName = filename;

  if (tryOn.previewImage) {
    tryOn.previewImage.hidden = false;
    tryOn.previewImage.src = dataUrl;
  }
  if (tryOn.resultPlaceholder) tryOn.resultPlaceholder.hidden = true;
  if (tryOn.previewPanel) tryOn.previewPanel.hidden = false;
  if (tryOn.downloadButton) tryOn.downloadButton.disabled = !dataUrl;
  if (tryOn.leadNote) {
    tryOn.leadNote.textContent = source === "ai"
      ? "AI try-on generated. Add your details and send it to WhatsApp."
      : "AI endpoint is not connected, so a local exact-frame preview was created.";
  }
}

async function generateSelfieTryOn() {
  if (!state.selfieFile || !state.selfieDataUrl) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Upload a selfie before generating try-on.";
    return;
  }

  const frame = getSelectedFrame();
  addFrameToSelection(frame.id, false);
  setTryOnBusy(true, "Generating AI try-on");

  try {
    const aiDataUrl = await submitAiTryOnToFreeModel(frame);
    const blob = aiDataUrl.startsWith("data:")
      ? await (await fetch(aiDataUrl)).blob()
      : null;
    showTryOnResult(aiDataUrl, blob, "ai");
  } catch (error) {
    const local = await createLocalTryOnPreview(frame);
    showTryOnResult(local.dataUrl, local.blob, "local");
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

  state.selfieFile = file;
  state.selfieDataUrl = await fileToDataUrl(file);
  state.capturedBlob = null;
  state.capturedFile = null;
  state.capturedDataUrl = "";

  if (tryOn.beforeImage) {
    tryOn.beforeImage.hidden = false;
    tryOn.beforeImage.src = state.selfieDataUrl;
  }
  if (tryOn.beforePlaceholder) tryOn.beforePlaceholder.hidden = true;
  if (tryOn.previewImage) {
    tryOn.previewImage.hidden = true;
    tryOn.previewImage.removeAttribute("src");
  }
  if (tryOn.resultPlaceholder) tryOn.resultPlaceholder.hidden = false;
  if (tryOn.previewPanel) tryOn.previewPanel.hidden = true;
  if (tryOn.uploadState) setPill(tryOn.uploadState, "badge-check", "Selfie uploaded");
  if (tryOn.leadNote) tryOn.leadNote.textContent = "Selfie ready. Generate your AI try-on preview.";
  setTryOnBusy(false);
}

function downloadCapture() {
  if (!state.capturedBlob && !state.capturedDataUrl) return;
  const link = document.createElement("a");
  link.href = state.capturedObjectUrl || state.capturedDataUrl || URL.createObjectURL(state.capturedBlob);
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

  if (state.capturedObjectUrl) {
    URL.revokeObjectURL(state.capturedObjectUrl);
    state.capturedObjectUrl = "";
  }

  if (tryOn.previewPanel) tryOn.previewPanel.hidden = true;
  if (tryOn.beforeImage) {
    tryOn.beforeImage.hidden = true;
    tryOn.beforeImage.removeAttribute("src");
  }
  if (tryOn.beforePlaceholder) tryOn.beforePlaceholder.hidden = false;
  if (tryOn.previewImage) tryOn.previewImage.removeAttribute("src");
  if (tryOn.resultPlaceholder) tryOn.resultPlaceholder.hidden = false;
  if (tryOn.downloadButton) tryOn.downloadButton.disabled = true;
  if (tryOn.selfieInput) tryOn.selfieInput.value = "";
  if (tryOn.uploadState) setPill(tryOn.uploadState, "image-up", "Upload selfie", true);
  if (tryOn.leadNote) tryOn.leadNote.textContent = "Upload a selfie to generate your AI try-on.";
  setTryOnBusy(false);
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
    ...frames.map((frame, index) => `${index + 1}. ${frame.name} - ${frame.brand} - ${getFramePriceLabel(frame)}`)
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
    frames.length ? `Frame total: ${lead.frameTotalLabel || getFrameTotalLabel(frames)}` : "",
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
  const frameTotal = frames.reduce((sum, frame) => sum + getFramePrice(frame), 0);
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
      shape: frame.shape,
      size: frame.size,
      colour: frame.colour,
      availability: frame.availability,
      price: frame.price,
      priceLabel: getFramePriceLabel(frame),
      file: frame.file
    })),
    frameTotal,
    frameTotalLabel: getFrameTotalLabel(frames),
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
  formData.append("frameTotalLabel", lead.frameTotalLabel || "");
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

  if (!state.capturedDataUrl) {
    if (tryOn.leadNote) tryOn.leadNote.textContent = "Generate your AI try-on before sending.";
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
    service: "AI Try-On",
    source: "selfie AI try-on",
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
      ? frames.map((frame) => `${frame.name} (${getFramePriceLabel(frame)})`).join(", ")
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
  renderAllFrameSurfaces();
  selectFrame(0);

  tryOn.openButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToSection("#tryon");
      if (tryOn.selfieInput) window.setTimeout(() => tryOn.selfieInput.focus(), 350);
    });
  });

  if (tryOn.prevButton) tryOn.prevButton.addEventListener("click", () => stepFrame(-1));
  if (tryOn.nextButton) tryOn.nextButton.addEventListener("click", () => stepFrame(1));
  if (tryOn.selfieInput) tryOn.selfieInput.addEventListener("change", handleSelfieInput);
  if (tryOn.generateButton) tryOn.generateButton.addEventListener("click", generateSelfieTryOn);
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
  setTryOnBusy(false);
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
        if (tryOn.leadNote) tryOn.leadNote.textContent = `${frame.name} selected. Upload a selfie to generate AI try-on.`;
        if (tryOn.selfieInput) window.setTimeout(() => tryOn.selfieInput.focus(), 350);
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
