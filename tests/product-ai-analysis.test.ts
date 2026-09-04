import assert from "node:assert/strict";
import test from "node:test";
import { productAiDraftSchema } from "../lib/product-ai";

test("product AI drafts discard physical measurements so staff enter verified specs", () => {
  const draft = productAiDraftSchema.parse({
    name: "Aviator",
    brand: "Vision Vistara",
    shortDescription: "Lightweight aviator frame",
    description: "A lightweight aviator frame.",
    material: "Metal",
    colour: "Black",
    finish: "Matte",
    shape: "Aviator",
    rimType: "Full rim",
    gender: "Unisex",
    ageGroup: "Adult",
    highlights: [],
    faceShapes: [],
    lensCompatibility: [],
    seoTitle: "Aviator frame",
    seoDescription: "Lightweight aviator frame",
    seoKeywords: [],
    categoryHint: "Aviator",
    confidence: "medium",
    needsReview: [],
    frameWidth: 140,
    lensWidth: 55,
    bridgeWidth: 18,
    templeLength: 145,
  });

  assert.equal("frameWidth" in draft, false);
  assert.equal("lensWidth" in draft, false);
  assert.equal("bridgeWidth" in draft, false);
  assert.equal("templeLength" in draft, false);
});
