d8.file.execute("test/mjsunit/wasm/wasm-module-builder.js");
const builder = new WasmModuleBuilder();
const o9 = {
    "initial": 3124,
};
const v10 = new WebAssembly.Memory(o9);
const v12 = WebAssembly.Memory;
const o14 = {
    "initial": 49149,
};
const v15 = new v12(o14);
const v17 = WebAssembly.Memory;
const o19 = {
    "initial": 0,
};
const v20 = new v17(o19);
const v22 = builder.addType(kSig_i_iii);
const v23 = builder.nextTypeIndex(v22, v10);
builder.addType(makeSig([], [kWasmF32,kWasmI32,wasmRefType(kWasmFuncRef),wasmRefType(v23),kWasmI32,kWasmF32,kWasmI32,kWasmI64,kWasmI32,wasmRefType(kWasmFuncRef),wasmRefType(v22)]));
builder.addImportedMemory("imp_mem", "imp_mem0");
builder.addImportedMemory("imp_mem", "imp_mem1", 49149);
builder.addImportedMemory("imp_mem", "imp_mem2");
builder.addMemory();

const v57 = builder.addFunction(undefined, v22);
const v58 = builder.addFunction(undefined, v23);
const v62 = builder.addTable(kWasmFuncRef, 2);
const v63 = v62.index;
const v66 = wasmI32Const(0);
const v69 = [kExprRefFunc,v57.index];
const v72 = [kExprRefFunc,v58.index];
builder.addActiveElementSegment(v63, v66, [v69,v72], kWasmFuncRef);
const v156 = [kExprRefFunc,v58.index,kExprLocalSet,4,...wasmF64Const(),...wasmF64Const(),...wasmF64Const(kWasmI64, v72, wasmF64Const, 3124),kExprF64Div,kExprF64Ne,...wasmI32Const(541),...wasmI32Const(156106),kExprI32GeU,...wasmF64Const(),...wasmF64Const("imp_mem", 49149, kWasmFuncRef),kExprF64Eq,...wasmI32Const(-1118406780),...wasmI32Const(-729821434),kAtomicPrefix,kExprI32AtomicOr8U,64,1,...wasmUnsignedLeb(132),kAtomicPrefix,kExprI32AtomicSub,66,3,...wasmUnsignedLeb(29693),kExprI32Ror,kExprI32Eq,kExprTableGet,v62.index,kGCPrefix,kExprRefCastNull,kFuncRefCode,kGCPrefix,kExprRefCast,v22,kExprLocalSet,5,kExprRefFunc,v58.index,kExprLocalSet,6,kExprRefFunc,v57.index,kExprLocalSet,7,kExprRefFunc,v57.index,kExprLocalSet,10,kExprRefFunc,v57.index,kExprLocalSet,15,kExprRefFunc,v57.index,kExprLocalSet,28,...wasmI32Const(92)];
const v158 = wasmRefType(v22);
const v177 = wasmRefType(v22);
const v187 = wasmRefType(kWasmFuncRef);
const v193 = wasmRefType(kWasmFuncRef);
const v196 = wasmRefType(v23);
const v199 = wasmRefType(v22);
const v203 = wasmRefType(kWasmFuncRef);
v57.addLocals(kWasmI32, 1).addLocals(v203, 1).addLocals(v199, 1).addLocals(v196, 1).addLocals(v193, 1).addLocals(kWasmI32, 2).addLocals(v187, 1).addLocals(kWasmF32, 1).addLocals(kWasmI64, 2).addLocals(kWasmI32, 1).addLocals(v177, 1).addLocals(kWasmF32, 1).addLocals(kWasmF64, 2).addLocals(kWasmF32, 1).addLocals(kWasmF64, 1).addLocals(kWasmI32, 1).addLocals(kWasmF32, 1).addLocals(kWasmF64, 1).addLocals(kWasmI32, 4).addLocals(v158, 1).addBody(v156);
const v357 = [kExprRefNull,v23,kExprRefAsNonNull,kExprLocalSet,2,...wasmF32Const(),kExprI32Const,0,kExprRefFunc,v57.index,kExprRefFunc,v58.index,...wasmI32Const(492),...wasmF32Const(),...wasmI32Const(397),...wasmI64Const(4709896709208504372n),...wasmI32Const(879725829),kExprRefNull,v22,kGCPrefix,kExprRefCast,kFuncRefCode,kExprRefNull,kFuncRefCode,kGCPrefix,kExprRefCastNull,v22,kExprRefAsNonNull,kGCPrefix,kExprBrOnCastFail,0,0,v22,v22,kExprLocalSet,6,kExprLocalSet,2,kExprLocalSet,0,kExprLocalSet,1,kExprLocalSet,0,kExprLocalSet,3,kExprLocalSet,0,kExprLocalSet,4,kExprLocalSet,2,kExprLocalSet,0,kExprLocalSet,3,kExprRefNull,v22,kGCPrefix,kExprRefCastNull,v23,kGCPrefix,kExprRefCastNull,v23,kGCPrefix,kExprRefCastNull,v23,kGCPrefix,kExprRefCastNull,kFuncRefCode,kGCPrefix,kExprRefCastNull,v22,kGCPrefix,kExprRefCastNull,v23,kExprRefAsNonNull,kGCPrefix,kExprRefCastNull,kFuncRefCode,kGCPrefix,kExprRefCastNull,kFuncRefCode,kGCPrefix,kExprRefCast,v23,kExprLocalSet,4,kExprRefFunc,v57.index,kExprLocalSet,6,kExprRefFunc,v57.index,kExprLocalSet,12,kExprRefFunc,v58.index,kExprLocalSet,14,kExprRefFunc,v58.index,kExprLocalSet,15,...wasmF32Const(kWasmFuncRef, kGCPrefix, 1, 0),...wasmI32Const(97152695),kExprRefFunc,v57.index,kExprRefFunc,v58.index,...wasmI32Const(12213192),...wasmF32Const(),...wasmI32Const(2987),...wasmI64Const(2572688775763160151n),...wasmI32Const(131428468),kExprRefFunc,v57.index,kExprRefFunc,v57.index];
const v362 = wasmRefType(v23);
const v367 = wasmRefType(v22);
const v378 = wasmRefType(v22);
const v383 = wasmRefType(v23);
const v389 = wasmRefType(kWasmFuncRef);
v58.addLocals(kWasmI32, 1).addLocals(kWasmI64, 1).addLocals(v389, 1).addLocals(kWasmF32, 1).addLocals(v383, 1).addLocals(kWasmI32, 1).addLocals(v378, 1).addLocals(kWasmI64, 1).addLocals(kWasmF32, 1).addLocals(kWasmI32, 2).addLocals(kWasmF32, 1).addLocals(v367, 1).addLocals(kWasmI32, 1).addLocals(v362, 2).addLocals(kWasmI32).addLocals(kWasmI64).addLocals(kWasmI32).addBody(v357);
builder.addExport("main");
const o415 = {
    "imp_mem2": v20,
    "imp_mem1": v15,
    "imp_mem0": v10,
};
const o416 = {
    "imp_mem": o415,
};
let instance = builder.instantiate(o416);
instance.exports.main();

