import assert from "node:assert/strict";
import test from "node:test";
import { openRouterChatText, openRouterResponseModel, productEnrichmentModels } from "../lib/product-ai";

test("reads a JSON draft from an OpenRouter chat completion", () => {
  const text = openRouterChatText({
    choices: [{ message: { content: '{"name":"Aviator"}' } }]
  });

  assert.equal(text, '{"name":"Aviator"}');
});

test("reports the actual free model chosen by OpenRouter", () => {
  assert.equal(
    openRouterResponseModel({ model: "qwen/qwen3-vl-8b-instruct:free" }, "openrouter/free"),
    "qwen/qwen3-vl-8b-instruct:free"
  );
  assert.equal(openRouterResponseModel({}, "openrouter/free"), "openrouter/free");
});

test("product enrichment honours configured models and keeps a backup", () => {
  assert.deepEqual(productEnrichmentModels({
    OPENROUTER_PRODUCT_ENRICHMENT_MODEL: " custom/vision ",
    OPENROUTER_PRODUCT_ENRICHMENT_FALLBACK_MODEL: "custom/backup"
  }), ["custom/vision", "custom/backup", "nvidia/nemotron-3.5-super-vl:free"]);
});

test("product enrichment deduplicates models and handles blank settings", () => {
  assert.equal(productEnrichmentModels({
    OPENROUTER_PRODUCT_ENRICHMENT_MODEL: "same/model",
    OPENROUTER_PRODUCT_ENRICHMENT_FALLBACK_MODEL: "same/model"
  }).filter(model => model === "same/model").length, 1);
  assert.deepEqual(productEnrichmentModels({ OPENROUTER_PRODUCT_ENRICHMENT_MODEL: " " }),
    productEnrichmentModels({}));
});
