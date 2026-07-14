import assert from "node:assert/strict";
import test from "node:test";
import { openRouterChatText, openRouterResponseModel } from "../lib/product-ai";

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
