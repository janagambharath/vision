import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductAnalysisToken,
  readVerifiedProductAnalysis
} from "../lib/product-ai-analysis";
import type { ProductAiDraft } from "../lib/product-ai";

const imageUrl = "https://res.cloudinary.com/vision/image/upload/v1/products/frame.png";

const draft: ProductAiDraft = {
  name: "Aviator",
  brand: "Vision Vistara",
  shortDescription: "Lightweight aviator frame",
  description: "A lightweight aviator frame with visible size marking.",
  material: "Metal",
  colour: "Black",
  finish: "Matte",
  shape: "Aviator",
  rimType: "Full rim",
  gender: "Unisex",
  ageGroup: "Adult",
  size: "55-18-145",
  measurements: "55-18-145",
  weightGrams: null,
  frameWidth: 140,
  lensWidth: 55,
  bridgeWidth: 18,
  templeLength: 145,
  frameHeight: null,
  pdRange: "62-66 mm",
  highlights: [],
  faceShapes: [],
  lensCompatibility: [],
  seoTitle: "Aviator frame",
  seoDescription: "Lightweight aviator frame",
  seoKeywords: [],
  categoryHint: "Aviator",
  confidence: "medium",
  needsReview: []
};

test("product analysis measurements are bound to the analyzed product image", () => {
  const previousSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-analysis-secret";
  try {
    const token = createProductAnalysisToken({ imageUrl, draft });
    assert.deepEqual(readVerifiedProductAnalysis(token, [imageUrl]), {
      size: "55-18-145",
      measurements: "55-18-145",
      weightGrams: null,
      frameWidth: 140,
      lensWidth: 55,
      bridgeWidth: 18,
      templeLength: 145,
      frameHeight: null,
      pdRange: "62-66 mm"
    });
    assert.equal(readVerifiedProductAnalysis(token, ["https://res.cloudinary.com/vision/image/upload/v1/products/other.png"]), null);
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
  }
});
