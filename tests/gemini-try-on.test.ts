import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGeminiTryOnPrompt,
  parseDataImage,
  selectTryOnProductImage
} from "../lib/ai/gemini";

test("try-on selects a transparent product asset before front and gallery images", () => {
  const selected = selectTryOnProductImage([
    { url: "https://cdn.example/front.jpg", role: "front", sortOrder: 0 },
    { url: "https://cdn.example/transparent.png", role: "transparent", sortOrder: 1 }
  ]);

  assert.deepEqual(selected, { url: "https://cdn.example/transparent.png", role: "transparent" });
});

test("try-on falls back from a missing transparent asset to front, then ordered gallery", () => {
  assert.deepEqual(selectTryOnProductImage([
    { url: "https://cdn.example/gallery.jpg", role: "gallery", sortOrder: 2 },
    { url: "https://cdn.example/front.jpg", role: "front", sortOrder: 3 }
  ]), { url: "https://cdn.example/front.jpg", role: "front" });

  assert.deepEqual(selectTryOnProductImage([
    { url: "https://cdn.example/second.jpg", role: "gallery", sortOrder: 2 },
    { url: "https://cdn.example/first.jpg", role: "gallery", sortOrder: 1 }
  ]), { url: "https://cdn.example/first.jpg", role: "fallback" });
});

test("try-on validates compact customer image data and produces an exact-frame prompt", () => {
  const image = parseDataImage("data:image/jpeg;base64,aGVsbG8=");
  assert.equal(image?.bytes, 5);
  assert.equal(parseDataImage("data:image/gif;base64,aGVsbG8="), null);

  const prompt = buildGeminiTryOnPrompt({
    brand: "Vision Vistara",
    name: "Classic Rectangle",
    sku: "VV-001",
    material: "Acetate",
    colour: "Black",
    finish: "Gloss",
    shape: "Rectangle",
    rimType: "Full rim"
  });
  assert.match(prompt, /do not beautify/i);
  assert.match(prompt, /Classic Rectangle/);
});
