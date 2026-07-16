import assert from "node:assert/strict";
import test from "node:test";
import {
  assertGeminiInlineImageBudget,
  buildGeminiTryOnPrompt,
  classifyGeminiGenerationError,
  deleteTryOnAsset,
  geminiTryOnModel,
  MAX_GEMINI_INLINE_INPUT_BYTES,
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

test("try-on defaults and migrates the former image model to Flash Lite Image", () => {
  const previous = process.env.GEMINI_TRY_ON_MODEL;
  delete process.env.GEMINI_TRY_ON_MODEL;
  try {
    assert.equal(geminiTryOnModel(), "gemini-3.1-flash-lite-image");
    process.env.GEMINI_TRY_ON_MODEL = "gemini-3.1-flash-image";
    assert.equal(geminiTryOnModel(), "gemini-3.1-flash-lite-image");
    process.env.GEMINI_TRY_ON_MODEL = "custom-image-model";
    assert.equal(geminiTryOnModel(), "custom-image-model");
  } finally {
    if (previous === undefined) delete process.env.GEMINI_TRY_ON_MODEL;
    else process.env.GEMINI_TRY_ON_MODEL = previous;
  }
});

test("try-on does not retry a Gemini project with zero image-generation quota", () => {
  const error = classifyGeminiGenerationError(new Error('{"error":{"code":429,"message":"Quota exceeded. limit: 0, model: gemini-3.1-flash-image","status":"RESOURCE_EXHAUSTED"}}'));
  assert.equal(error.retryable, false);
  assert.equal(error.status, 429);
  assert.equal(error.retryAfterSeconds, undefined);
  assert.match(error.message, /temporarily unavailable/i);
});

test("try-on gives a retry window for a temporary Gemini capacity limit", () => {
  const error = classifyGeminiGenerationError(new Error("RESOURCE_EXHAUSTED. Please retry in 40.1s."));
  assert.equal(error.retryable, false);
  assert.equal(error.status, 429);
  assert.equal(error.retryAfterSeconds, 41);
  assert.match(error.message, /41 seconds/i);
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

test("try-on rejects a combined inline payload that would risk the Gemini request limit", () => {
  const image = parseDataImage("data:image/jpeg;base64,aGVsbG8=")!;
  assert.doesNotThrow(() => assertGeminiInlineImageBudget(image, image));
  assert.throws(
    () => assertGeminiInlineImageBudget({ ...image, bytes: MAX_GEMINI_INLINE_INPUT_BYTES }, { ...image, bytes: 1 }),
    /too large/i
  );
});

test("preview deletion fails closed when Cloudinary credentials are unavailable", async () => {
  const previous = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  };
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;

  try {
    await assert.rejects(deleteTryOnAsset("temporary-preview"), /deletion cannot be confirmed/i);
  } finally {
    if (previous.cloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = previous.cloudName;
    if (previous.apiKey === undefined) delete process.env.CLOUDINARY_API_KEY;
    else process.env.CLOUDINARY_API_KEY = previous.apiKey;
    if (previous.apiSecret === undefined) delete process.env.CLOUDINARY_API_SECRET;
    else process.env.CLOUDINARY_API_SECRET = previous.apiSecret;
  }
});
