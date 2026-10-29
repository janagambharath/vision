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
  }), ["custom/vision", "custom/backup", "google/gemma-4-31b-it:free", "openrouter/free"]);
});

test("product enrichment deduplicates models and handles blank settings", () => {
  assert.equal(productEnrichmentModels({
    OPENROUTER_PRODUCT_ENRICHMENT_MODEL: "same/model",
    OPENROUTER_PRODUCT_ENRICHMENT_FALLBACK_MODEL: "same/model"
  }).filter(model => model === "same/model").length, 1);
  assert.deepEqual(productEnrichmentModels({ OPENROUTER_PRODUCT_ENRICHMENT_MODEL: " " }),
    productEnrichmentModels({}));
});


import { generateWithOpenRouter } from "../lib/product-ai-service";

const imageUrl = "https://res.cloudinary.com/store/image/upload/frame.jpg";
function mockResponses(responses: (Response | Error)[], requests: RequestInit[] = []): typeof fetch {
  return (async (_url: unknown, init?: RequestInit) => {
    requests.push(init ?? {});
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (!next) throw new Error("Unexpected extra request");
    return next;
  }) as typeof fetch;
}
function providerError(status: number, message: string, httpStatus = status) {
  return Response.json({ error: { code: status, message } }, { status: httpStatus });
}
const successfulDraft = () => Response.json({ model: "actual/vision", choices: [{ message: { content: '{"name":"Black rectangle frame","confidence":"medium"}' } }] });

test("rate-limit failures survive a later unavailable endpoint (production log regression)", async () => {
  await assert.rejects(generateWithOpenRouter(imageUrl, {
    apiKey: "test-key", models: ["primary", "gemma", "missing"],
    fetchImpl: mockResponses([new DOMException("Timed out", "TimeoutError"), providerError(429, "Rate limit exceeded"), providerError(404, "No endpoints found")])
  }), /rate limited.*429/);
});

test("empty output falls back and preserves the requested image", async () => {
  const requests: RequestInit[] = [];
  const result = await generateWithOpenRouter(imageUrl, {
    apiKey: "test-key", models: ["primary", "backup"],
    fetchImpl: mockResponses([Response.json({ choices: [{ message: { content: "" } }] }), successfulDraft()], requests)
  });
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.model, "actual/vision");
  assert.equal(result.draft.name, "Black rectangle frame");
  const body = JSON.parse(String(requests[1].body));
  assert.equal(body.messages[1].content[1].image_url.url, imageUrl);
  assert.equal(body.reasoning.enabled, false);
  assert.equal(body.model, "backup");
});

test("OpenRouter error bodies are recognised even with HTTP 200", async () => {
  await assert.rejects(generateWithOpenRouter(imageUrl, {
    apiKey: "test-key", models: ["primary"],
    fetchImpl: mockResponses([providerError(429, "Rate limit exceeded", 200)])
  }), /rate limited/);
});

test("privacy-routing errors explain the account setting without exposing provider payloads", async () => {
  await assert.rejects(generateWithOpenRouter(imageUrl, {
    apiKey: "test-key", models: ["primary"],
    fetchImpl: mockResponses([providerError(404, "No endpoints found matching your data policy (Free model publication).")])
  }), /data policy/);
});

test("authentication errors stop retries", async () => {
  const requests: RequestInit[] = [];
  await assert.rejects(generateWithOpenRouter(imageUrl, {
    apiKey: "test-key", models: ["primary", "backup"],
    fetchImpl: mockResponses([providerError(401, "Invalid key")], requests)
  }), /rejected the API key/);
  assert.equal(requests.length, 1);
});

test("configured free router still has a direct vision backup", () => {
  const models = productEnrichmentModels({ OPENROUTER_PRODUCT_ENRICHMENT_MODEL: "openrouter/free" });
  assert.ok(models.includes("google/gemma-4-31b-it:free"));
  assert.equal(models.filter(model => model === "openrouter/free").length, 1);
  assert.equal(models.some(model => model.includes("nemotron")), false);
});


test("a confidence-only response cannot be reported as a completed draft", async () => {
  await assert.rejects(generateWithOpenRouter(imageUrl, {
    apiKey: "test-key", models: ["primary"],
    fetchImpl: mockResponses([Response.json({ choices: [{ message: { content: '{"confidence":"low"}' } }] })])
  }), /incomplete or invalid catalog draft/);
});
