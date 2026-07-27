"use strict";

const w = new Worker("worker.js");

const sab = new SharedArrayBuffer(1, { maxByteLength: 0x4000 });
const ta = new Uint8Array(sab);

w.postMessage(sab);

// Races with worker-side grow() calls.
for (let i = 0; i < 2000; ++i) {
  Object.values(ta);
}

w.terminate();
