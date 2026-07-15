"use client";

import { type FormEvent, useRef, useState } from "react";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import type { ProductAiDraft } from "@/lib/product-ai";

type Category = { id: string; slug: string; name: string };
type Brand = { id: string; slug: string; name: string };

type ProductData = {
  name?: string;
  brand?: string;
  brandId?: string | null;
  sku?: string;
  barcode?: string | null;
  slug?: string;
  status?: string;
  featured?: boolean;
  tryAtHomeEligible?: boolean;
  tryOnEligible?: boolean;
  arImageUrl?: string | null;
  codAvailable?: boolean;
  pricePaise?: number | null;
  compareAtPaise?: number | null;
  costPricePaise?: number | null;
  taxPct?: number | null;
  quantity?: number;
  description?: string;
  shortDescription?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  material?: string | null;
  colour?: string | null;
  finish?: string | null;
  shape?: string | null;
  rimType?: string | null;
  size?: string | null;
  measurements?: string | null;
  weightGrams?: number | null;
  frameWidth?: number | null;
  lensWidth?: number | null;
  bridgeWidth?: number | null;
  templeLength?: number | null;
  frameHeight?: number | null;
  pdRange?: string | null;
  springHinges?: boolean;
  blueLightCompatible?: boolean;
  prescriptionCompatible?: boolean;
  careInstructions?: string | null;
  warranty?: string | null;
  returnPolicy?: string | null;
  deliveryEstimate?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  highlights?: string[];
  faceShapes?: string[];
  lensCompatibility?: string[];
  linkedCategorySlugs?: string[];
  images?: UploadedImage[];
};

type Props = {
  product?: ProductData;
  categories: Category[];
  brands: Brand[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

const TABS = [
  { key: "general", label: "Product basics" },
  { key: "pricing", label: "Pricing & Inventory" },
  { key: "specs", label: "Optional frame specs" },
  { key: "images", label: "Images & AI" },
  { key: "seo", label: "Optional SEO" },
  { key: "policy", label: "Optional policies" },
];

export function ProductForm({ product, categories, brands, action, submitLabel }: Props) {
  const [activeTab, setActiveTab] = useState(product ? "general" : "images");
  const [images, setImages] = useState<UploadedImage[]>(product?.images ?? []);
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [aiState, setAiState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [aiMessage, setAiMessage] = useState("");
  const [aiAnalysisToken, setAiAnalysisToken] = useState("");
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const autoSlug = () => {
    if (!slug || slug === product?.slug) {
      const generated = `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setSlug(generated);
    }
  };

  const firstProductImage = images.find((image) => image.role === "front") ?? images.find((image) => image.role !== "ar");

  const fieldIsBlank = (fieldName: string) => {
    const control = formRef.current?.elements.namedItem(fieldName);
    if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLTextAreaElement) && !(control instanceof HTMLSelectElement)) {
      return true;
    }
    return !control.value.trim();
  };

  const fillTextField = (fieldName: string, value: string) => {
    if (!value || !fieldIsBlank(fieldName)) return;
    const control = formRef.current?.elements.namedItem(fieldName);
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
      control.value = value;
    }
  };

  const fillNumberField = (fieldName: string, value: number | null) => {
    if (value === null || !fieldIsBlank(fieldName)) return;
    fillTextField(fieldName, String(value));
  };

  const applyAiDraft = (draft: ProductAiDraft, provider: string, fallbackUsed: boolean) => {
    if (!name.trim() && draft.name) setName(draft.name);
    if (!brand.trim() && draft.brand) setBrand(draft.brand);

    const proposedName = name.trim() || draft.name;
    const proposedBrand = brand.trim() || draft.brand;
    if (!slug.trim() && proposedName && proposedBrand) {
      setSlug(`${proposedBrand}-${proposedName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }

    fillTextField("shortDescription", draft.shortDescription);
    fillTextField("description", draft.description);
    fillTextField("material", draft.material);
    fillTextField("colour", draft.colour);
    fillTextField("finish", draft.finish);
    fillTextField("shape", draft.shape);
    fillTextField("rimType", draft.rimType);
    fillTextField("gender", draft.gender);
    fillTextField("ageGroup", draft.ageGroup);
    fillTextField("size", draft.size);
    fillTextField("measurements", draft.measurements);
    fillNumberField("weightGrams", draft.weightGrams);
    fillNumberField("frameWidth", draft.frameWidth);
    fillNumberField("lensWidth", draft.lensWidth);
    fillNumberField("bridgeWidth", draft.bridgeWidth);
    fillNumberField("templeLength", draft.templeLength);
    fillNumberField("frameHeight", draft.frameHeight);
    fillTextField("pdRange", draft.pdRange);
    fillTextField("highlights", draft.highlights.join("\n"));
    fillTextField("faceShapes", draft.faceShapes.join(", "));
    fillTextField("lensCompatibility", draft.lensCompatibility.join("\n"));
    fillTextField("seoTitle", draft.seoTitle);
    fillTextField("seoDescription", draft.seoDescription);
    fillTextField("seoKeywords", draft.seoKeywords.join(", "));

    const reviewSummary = [
      `AI confidence: ${draft.confidence}.`,
      draft.categoryHint ? `Suggested category: ${draft.categoryHint}.` : "",
      ...draft.needsReview
    ].filter(Boolean).join(" ");
    setAiState("ready");
    setAiMessage(`${fallbackUsed ? "Nemotron was unavailable, so OpenRouter's free fallback completed this draft. " : `${provider === "openrouter" ? "Nemotron" : "AI"} completed this draft. `}${reviewSummary} AI filled empty fields only; verify every suggestion before publishing.`);
  };

  const generateAiDraft = async (image = firstProductImage) => {
    if (!image) {
      setAiState("error");
      setAiMessage("Upload a clear front or gallery image first.");
      return;
    }

    setAiState("loading");
    setAiMessage("Inspecting the uploaded frame and drafting catalog details…");
    try {
      const response = await fetch("/api/admin/product-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: image.url })
      });
      const result = await response.json();
      if (!response.ok || !result.draft || !result.analysisToken) throw new Error(result.error || "AI product enrichment failed.");
      setAiAnalysisToken(String(result.analysisToken));
      applyAiDraft(result.draft as ProductAiDraft, String(result.provider ?? "AI"), Boolean(result.fallbackUsed));
    } catch (error) {
      setAiState("error");
      setAiMessage(error instanceof Error ? error.message : "AI product enrichment failed.");
    }
  };

  const handleImagesChange = (nextImages: UploadedImage[]) => {
    const nextPrimary = nextImages.find((image) => image.role === "front") ?? nextImages.find((image) => image.role !== "ar");
    const previousUrl = firstProductImage?.url;
    setImages(nextImages);

    // New frame photography gets analyzed automatically. Reordering an
    // already-analyzed image does not spend another free-model request.
    if (nextPrimary?.url !== previousUrl) {
      setAiAnalysisToken("");
      if (nextPrimary) void generateAiDraft(nextPrimary);
    }
  };

  const validateCreate = (event: FormEvent<HTMLFormElement>) => {
    if (product) return;

    const formData = new FormData(event.currentTarget);
    const missing: string[] = [];
    if (!String(formData.get("name") ?? "").trim()) missing.push("product name");
    if (!String(formData.get("brand") ?? "").trim()) missing.push("brand");
    if (!String(formData.get("description") ?? "").trim()) missing.push("full description");
    if (!Number.isFinite(Number(formData.get("pricePaise"))) || Number(formData.get("pricePaise")) <= 0) missing.push("selling price");
    if (!String(formData.get("quantity") ?? "").trim() || !Number.isInteger(Number(formData.get("quantity"))) || Number(formData.get("quantity")) < 0) missing.push("stock quantity");
    if (!formData.getAll("categories").length) missing.push("category");
    if (!images.some((image) => image.role !== "ar" && image.url)) missing.push("product image");

    if (missing.length) {
      event.preventDefault();
      setSubmitError(`Complete ${missing.join(", ")} before creating this product.`);
      setActiveTab(missing.some((item) => item === "selling price" || item === "stock quantity") ? "pricing" : "general");
      return;
    }
    setSubmitError("");
  };

  return (
    <form ref={formRef} action={action} onSubmit={validateCreate} noValidate className="grid gap-6">
      <input type="hidden" name="aiAnalysisToken" value={aiAnalysisToken} />
      <section className="rounded-vv border border-teal-200 bg-teal-50/60 p-4 text-sm text-teal-950">
        <strong className="block font-extrabold">Fast catalog workflow</strong>
        <p className="mt-1">Upload a clear front image, let AI draft visual details, then confirm the essentials: name, brand, description, price, stock, category, and image. The product is not created until these are complete; its SKU is issued automatically.</p>
      </section>
      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-0 [scrollbar-width:thin]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === tab.key
                ? "bg-white text-teal-700 border border-slate-200 border-b-white -mb-px"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GENERAL TAB */}
      <div className={activeTab === "general" ? "" : "hidden"}>
        <section className="vv-card grid gap-5 p-4 sm:p-6">
          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2">General Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Product Name *
              <input className="store-input" type="text" name="name" required value={name}
                onChange={(e) => setName(e.target.value)} onBlur={autoSlug}
                placeholder="e.g. Classic Aviator 3001" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Brand *
              <div className="flex gap-2">
                <input className="store-input flex-1" type="text" name="brand" required value={brand}
                  onChange={(e) => setBrand(e.target.value)} onBlur={autoSlug}
                  placeholder="e.g. Vision Vistara" list="brand-suggestions" />
                <datalist id="brand-suggestions">
                  {brands.map((b) => <option key={b.id} value={b.name} />)}
                </datalist>
                <select name="brandId" className="store-input w-40"
                  defaultValue={product?.brandId ?? ""}>
                  <option value="">No linked brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Barcode
              <input className="store-input" type="text" name="barcode"
                defaultValue={product?.barcode ?? ""} placeholder="EAN/UPC barcode" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Slug (auto-generated)
              <input className="store-input" type="text" name="slug" value={slug}
                onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated-from-name" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Gender
              <select className="store-input" name="gender" defaultValue={product?.gender ?? ""}>
                <option value="">Select gender</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Unisex">Unisex</option>
                <option value="Kids">Kids</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Age Group
              <select className="store-input" name="ageGroup" defaultValue={product?.ageGroup ?? ""}>
                <option value="">Select age group</option>
                <option value="Adult">Adult</option>
                <option value="Teen">Teen</option>
                <option value="Kids">Kids</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            Short Description
            <input className="store-input" type="text" name="shortDescription"
              defaultValue={product?.shortDescription ?? ""} placeholder="Brief one-liner for listings" />
          </label>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            Full Description *
            <textarea className="store-input min-h-24 py-2" name="description" required
              defaultValue={product?.description ?? ""}
              placeholder="Describe the frame design, materials, comfort, style..." />
          </label>

          {/* Categories */}
          <div>
            <span className="block text-sm font-extrabold text-slate-600 mb-2">Categories *</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => (
                <label key={cat.slug} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="categories" value={cat.slug}
                    defaultChecked={product?.linkedCategorySlugs?.includes(cat.slug)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
              <input type="checkbox" name="featured" defaultChecked={product?.featured}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
              <input type="checkbox" name="tryAtHomeEligible" defaultChecked={product?.tryAtHomeEligible ?? true}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              Try-at-Home Eligible
            </label>
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
              <input type="checkbox" name="tryOnEligible" defaultChecked={product?.tryOnEligible ?? false}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              Virtual Try-On Eligible
            </label>
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
              <input type="checkbox" name="codAvailable" defaultChecked={product?.codAvailable ?? true}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              COD Available
            </label>
          </div>
        </section>
      </div>

      {/* PRICING TAB */}
      <div className={activeTab === "pricing" ? "" : "hidden"}>
        <section className="vv-card grid gap-5 p-4 sm:p-6">
          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2">Pricing</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              MRP / Selling Price (₹) *
              <input className="store-input" type="number" step="0.01" min="0.01" name="pricePaise" required
                defaultValue={product?.pricePaise ? product.pricePaise / 100 : ""}
                placeholder="e.g. 1899.00" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Compare-at Price (₹)
              <input className="store-input" type="number" step="0.01" name="compareAtPaise"
                defaultValue={product?.compareAtPaise ? product.compareAtPaise / 100 : ""}
                placeholder="e.g. 2499.00" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Cost Price (₹)
              <input className="store-input" type="number" step="0.01" name="costPricePaise"
                defaultValue={product?.costPricePaise ? product.costPricePaise / 100 : ""}
                placeholder="For margin calculation" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Tax %
              <input className="store-input" type="number" name="taxPct"
                defaultValue={product?.taxPct ?? 18} placeholder="18" />
            </label>
          </div>

          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2 mt-4">Inventory</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Stock Quantity *
              <input className="store-input" type="number" name="quantity" required
                defaultValue={product?.quantity ?? ""} />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Supplier
              <input className="store-input" type="text" name="supplier"
                placeholder="Supplier name" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Warehouse / Location
              <input className="store-input" type="text" name="warehouse"
                defaultValue="Vision Vistara clinic inventory" placeholder="Storage location" />
            </label>
          </div>
        </section>
      </div>

      {/* SPECIFICATIONS TAB */}
      <div className={activeTab === "specs" ? "" : "hidden"}>
        <section className="vv-card grid gap-5 p-4 sm:p-6">
          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2">Frame Details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Material
              <input className="store-input" type="text" name="material"
                defaultValue={product?.material ?? ""} placeholder="e.g. Beta-Titanium" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Colour
              <input className="store-input" type="text" name="colour"
                defaultValue={product?.colour ?? ""} placeholder="e.g. Gloss Black" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Finish
              <input className="store-input" type="text" name="finish"
                defaultValue={product?.finish ?? ""} placeholder="e.g. Matte, Gloss, Brushed" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Shape
              <input className="store-input" type="text" name="shape"
                defaultValue={product?.shape ?? ""} placeholder="e.g. Round / Aviator" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Rim Type
              <input className="store-input" type="text" name="rimType"
                defaultValue={product?.rimType ?? ""} placeholder="e.g. Full Rim / Rimless" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              AI-detected weight (grams)
              <input className="store-input bg-slate-50 text-slate-500" type="number" name="weightGrams" readOnly tabIndex={-1}
                defaultValue={product?.weightGrams ?? ""} placeholder="Visible marking required" />
            </label>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm font-medium text-violet-950">
            Measurements are analyzed automatically after the first product image is uploaded. The server accepts them only from the matching AI analysis; if a marking is not visible, they remain blank.
          </div>
          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2 mt-2">AI-analyzed frame measurements</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Size marking
              <input className="store-input bg-slate-50 text-slate-500" type="text" name="size" readOnly tabIndex={-1}
                defaultValue={product?.size ?? ""} placeholder="AI reads visible marking" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Measurement summary
              <input className="store-input bg-slate-50 text-slate-500" type="text" name="measurements" readOnly tabIndex={-1}
                defaultValue={product?.measurements ?? ""} placeholder="AI reads visible marking" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Frame Width (mm)
              <input className="store-input bg-slate-50 text-slate-500" type="number" name="frameWidth" readOnly tabIndex={-1}
                defaultValue={product?.frameWidth ?? ""} />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Lens Width (mm)
              <input className="store-input bg-slate-50 text-slate-500" type="number" name="lensWidth" readOnly tabIndex={-1}
                defaultValue={product?.lensWidth ?? ""} />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Bridge Width (mm)
              <input className="store-input bg-slate-50 text-slate-500" type="number" name="bridgeWidth" readOnly tabIndex={-1}
                defaultValue={product?.bridgeWidth ?? ""} />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Temple Length (mm)
              <input className="store-input bg-slate-50 text-slate-500" type="number" name="templeLength" readOnly tabIndex={-1}
                defaultValue={product?.templeLength ?? ""} />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Frame Height (mm)
              <input className="store-input bg-slate-50 text-slate-500" type="number" name="frameHeight" readOnly tabIndex={-1}
                defaultValue={product?.frameHeight ?? ""} />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              PD Range
              <input className="store-input bg-slate-50 text-slate-500" type="text" name="pdRange" readOnly tabIndex={-1}
                defaultValue={product?.pdRange ?? ""} placeholder="AI reads visible marking" />
            </label>
          </div>

          {/* Compatibility flags */}
          <div className="flex flex-wrap gap-6 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
              <input type="checkbox" name="springHinges" defaultChecked={product?.springHinges}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              Spring Hinges
            </label>
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
              <input type="checkbox" name="blueLightCompatible" defaultChecked={product?.blueLightCompatible}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              Blue Light Compatible
            </label>
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
              <input type="checkbox" name="prescriptionCompatible" defaultChecked={product?.prescriptionCompatible ?? true}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4" />
              Prescription Compatible
            </label>
          </div>

          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2 mt-2">Additional Details</h2>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            Highlights (one per line)
            <textarea className="store-input min-h-20 py-2" name="highlights"
              defaultValue={product?.highlights?.join("\n") ?? ""}
              placeholder={"Ultra-light 12g titanium\nIP plating finish\nAdjustable nose pads"} />
          </label>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            Face Shapes (comma separated)
            <input className="store-input" type="text" name="faceShapes"
              defaultValue={product?.faceShapes?.join(", ") ?? ""} placeholder="Oval, Square, Heart, Diamond" />
          </label>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            Lens Compatibility (one per line)
            <textarea className="store-input min-h-20 py-2" name="lensCompatibility"
              defaultValue={product?.lensCompatibility?.join("\n") ?? ""}
              placeholder={"Single vision prescription lenses\nAnti-reflective coating\nPhotochromic lenses"} />
          </label>
        </section>
      </div>

      {/* IMAGES TAB */}
      <div className={activeTab === "images" ? "" : "hidden"}>
        <section className="vv-card grid gap-4 p-4 sm:p-6">
          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2">Product Images</h2>
          <p className="text-sm text-slate-500">Upload images via Cloudinary. Assign roles (Front, Angle, Side, etc.) and drag to reorder. The front image is used for the first AI catalog draft and the first image is the primary display image.</p>
          <ImageUploader
            images={images}
            onChange={handleImagesChange}
            productName={`${brand} ${name}`.trim() || "Product"}
          />
          <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-violet-950">AI product draft</h3>
                <p className="mt-1 text-xs font-medium text-violet-800">Nemotron analyzes the uploaded product image, with OpenRouter&apos;s free router as backup. It transcribes measurements only from clearly visible markings; it never invents price, SKU, stock, or policies.</p>
              </div>
              <button
                type="button"
                onClick={() => void generateAiDraft()}
                disabled={!firstProductImage || aiState === "loading"}
                className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiState === "loading" ? "Drafting…" : "Generate AI draft"}
              </button>
            </div>
            {aiMessage ? (
              <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${aiState === "error" ? "bg-red-50 text-red-800" : "bg-white/80 text-violet-950"}`} aria-live="polite">
                {aiMessage}
              </p>
            ) : null}
          </div>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            AR Overlay Image URL
            <input
              className="store-input"
              type="text"
              name="arImageUrl"
              defaultValue={product?.arImageUrl ?? images.find((image) => image.role === "ar")?.url ?? ""}
              placeholder="Transparent front-facing PNG/WebP overlay for virtual try-on"
            />
            <span className="text-xs font-semibold text-slate-400">
              Recommended for the most faithful AI try-on. If omitted, AI try-on automatically uses the product's front image, then the highest-priority gallery image.
            </span>
          </label>
        </section>
      </div>

      {/* SEO TAB */}
      <div className={activeTab === "seo" ? "" : "hidden"}>
        <section className="vv-card grid gap-4 p-4 sm:p-6">
          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2">Search Engine Optimization</h2>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            SEO Title
            <input className="store-input" type="text" name="seoTitle"
              defaultValue={product?.seoTitle ?? ""} placeholder="Auto-generated if blank" />
            <span className="text-xs text-slate-400">Recommended: 50-60 characters</span>
          </label>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            SEO Description
            <textarea className="store-input min-h-16 py-2" name="seoDescription"
              defaultValue={product?.seoDescription ?? ""}
              placeholder="Auto-generated from description if blank" />
            <span className="text-xs text-slate-400">Recommended: 150-160 characters</span>
          </label>
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            SEO Keywords (comma separated)
            <input className="store-input" type="text" name="seoKeywords"
              defaultValue={product?.seoKeywords?.join(", ") ?? ""}
              placeholder="eyeglasses, titanium frames, prescription glasses" />
          </label>
        </section>
      </div>

      {/* POLICY TAB */}
      <div className={activeTab === "policy" ? "" : "hidden"}>
        <section className="vv-card grid gap-4 p-4 sm:p-6">
          <h2 className="text-xl font-extrabold border-b border-slate-100 pb-2">Care, Warranty & Policies</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Care Instructions
              <textarea className="store-input min-h-16 py-2" name="careInstructions"
                defaultValue={product?.careInstructions ?? ""} placeholder="Clean with microfiber cloth..." />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Warranty
              <textarea className="store-input min-h-16 py-2" name="warranty"
                defaultValue={product?.warranty ?? ""} placeholder="1-year manufacturer warranty..." />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Return Policy
              <textarea className="store-input min-h-16 py-2" name="returnPolicy"
                defaultValue={product?.returnPolicy ?? ""} placeholder="7-day easy return..." />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Delivery Estimate
              <textarea className="store-input min-h-16 py-2" name="deliveryEstimate"
                defaultValue={product?.deliveryEstimate ?? ""} placeholder="3–5 business days..." />
            </label>
          </div>
        </section>
      </div>

      {/* STATUS & SUBMIT */}
      {submitError ? <p className="rounded-vv border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{submitError}</p> : null}
      <section className="vv-card sticky bottom-0 z-10 flex flex-col gap-3 border-t-2 border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <label className="flex w-full items-center gap-2 text-sm font-extrabold text-slate-600 sm:w-auto">
          Publish Status
          <select className="store-input min-w-0 sm:min-w-36" name="status" defaultValue={product?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active (Live in Store)</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <button className="vv-button-retail inline-flex w-full items-center gap-2 px-6 py-3 text-base sm:w-auto" type="submit">
          {submitLabel}
        </button>
      </section>
    </form>
  );
}
