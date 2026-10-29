import assert from "node:assert/strict";
import test from "node:test";
import { activeCameraFacing, openCamera } from "../lib/camera";

test("back camera requests stay on the rear camera through resolution fallback", async () => {
  const requests: MediaStreamConstraints[] = [];
  const stream = {} as MediaStream;
  const result = await openCamera("environment", {
    getUserMedia: async constraints => {
      requests.push(constraints!);
      if (requests.length === 1) throw new DOMException("Resolution unsupported", "OverconstrainedError");
      return stream;
    }
  });
  assert.equal(result, stream);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.audio, false);
    assert.deepEqual((request.video as MediaTrackConstraints).facingMode, { exact: "environment" });
  }
});

test("an unavailable back camera never silently falls back to the front camera", async () => {
  let calls = 0;
  await assert.rejects(openCamera("environment", {
    getUserMedia: async () => { calls++; throw new DOMException("No rear camera", "NotFoundError"); }
  }), /Back camera unavailable/);
  assert.equal(calls, 2);
});

test("camera permission refusal is not retried", async () => {
  let calls = 0;
  await assert.rejects(openCamera("user", {
    getUserMedia: async () => { calls++; throw new DOMException("Denied", "NotAllowedError"); }
  }), { name: "NotAllowedError" });
  assert.equal(calls, 1);
});

test("front camera can use a desktop webcam without facingMode metadata", async () => {
  let calls = 0;
  const stream = {} as MediaStream;
  assert.equal(await openCamera("user", { getUserMedia: async constraints => {
    calls++;
    if (constraints?.video !== true) throw new DOMException("Unsupported facingMode", "OverconstrainedError");
    return stream;
  } }), stream);
  assert.equal(calls, 3);
});

test("mirroring follows actual camera settings", () => {
  const stream = { getVideoTracks: () => [{ getSettings: () => ({ facingMode: "environment" }) }] } as unknown as MediaStream;
  assert.equal(activeCameraFacing(stream, "user"), "environment");
});
