import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGeminiTryOnPrompt,
  parseDataImage,
  selectTryOnProductImage
} from "../lib/integrations/gemini-try-on";

test("try-on selects a transparent product asset before front and gallery images", () => {
  const selected = selectTryOnProductImage([
    { url: "https://res.cloudinary.com/store/image/upload/front.jpg", role: "front", sortOrder: 0 },
    { url: "https://res.cloudinary.com/store/image/upload/transparent.png", role: "transparent", sortOrder: 1 }
  ]);
  assert.deepEqual(selected, { url: "https://res.cloudinary.com/store/image/upload/transparent.png", role: "transparent" });
});

test("try-on can use a regular front catalog image when no transparent asset exists", () => {
  const selected = selectTryOnProductImage([
    { url: "https://res.cloudinary.com/store/image/upload/front.jpg", role: "front", sortOrder: 0 },
    { url: "https://res.cloudinary.com/store/image/upload/angle.jpg", role: "angle", sortOrder: 1 }
  ]);
  assert.deepEqual(selected, { url: "https://res.cloudinary.com/store/image/upload/front.jpg", role: "front" });
});

test("try-on validates compact customer image data and produces an exact-frame prompt", () => {
  const image = parseDataImage("data:image/jpeg;base64,aGVsbG8=");
  assert.equal(image?.bytes, 5);
  assert.equal(parseDataImage("data:image/gif;base64,aGVsbG8="), null);

  const prompt = buildGeminiTryOnPrompt({
    brand: "Vision Vistara", name: "Classic Rectangle", sku: "VV-001", material: "Acetate",
    colour: "Black", finish: "Gloss", shape: "Rectangle", rimType: "Full rim"
  });
  assert.match(prompt, /do not.*beautify/i);
  assert.match(prompt, /Classic Rectangle/);
  assert.match(prompt, /Image 1.*selfie/i);
  assert.match(prompt, /Image 2.*frame/i);
});
