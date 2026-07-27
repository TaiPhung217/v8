function foo0(){console.log('foo0')}
function foo1(){console.log('foo1')}
d8.file.execute('./wasm-module-builder.js');

const builder = new WasmModuleBuilder();
builder.addStruct([]);
builder.addArray(kWasmFuncRef, true);
builder.startRecGroup();
builder.addType(makeSig([kWasmI32, kWasmI32, kWasmI32], [kWasmI32]));
builder.addType(makeSig([kWasmS128, kWasmS128, kWasmI32, kWasmI32, wasmRefType(2), kWasmS128, kWasmS128, kWasmS128, kWasmI32, kWasmI32, kWasmI32, kWasmI32, kWasmI32, kWasmI32, kWasmI32], [wasmRefNullType(kWasmNullExternRef), kWasmI32, kWasmI32, kWasmI32, wasmRefType(kWasmArrayRef), kWasmI32, kWasmExternRef, kWasmI32, kWasmI32, kWasmF32, wasmRefType(kWasmFuncRef), kWasmEqRef, wasmRefNullType(kWasmNullExternRef), wasmRefType(3), wasmRefType(kWasmExternRef)]));
builder.endRecGroup();
builder.addType(makeSig([], []));
builder.addMemory(16, 32);
builder.addTable(kWasmFuncRef, 2, 2, undefined)
builder.addActiveElementSegment(0, wasmI32Const(0), [[kExprRefFunc, 0, ], [kExprRefFunc, 1, ]], kWasmFuncRef);   
//builder.addActiveElementSegment(0, wasmI32Const(0), [[kExprRefFunc, 0, ], [kExprRefFunc, 1, ]], kWasmFuncRef);
builder.addTag(makeSig([], []));
// Generate function 1 (out of 2).
builder.addImport('mod', 'foo0', 2);
builder.addImport('mod', 'foo1', 3);

builder.addFunction(undefined, 2 /* sig */)
  .addLocals(wasmRefNullType(kWasmStructRef), 6).addLocals(wasmRefNullType(kWasmNullRef), 1).addLocals(wasmRefNullType(kWasmStructRef), 14)
  .addBodyWithEnd([
// signature: i_iii
// body:
kExprF32Const, 0xc4, 0xf4, 0xca, 0x37,  // f32.const
kExprF32Const, 0xc6, 0x21, 0xc7, 0xf7,  // f32.const
kExprI32Const, 0x00,  // i32.const
kSimdPrefix, kExprI8x16Splat,  // i8x16.splat
kExprI32Const, 0xf6, 0x96, 0x8c, 0xc6, 0x79,  // i32.const
kNumericPrefix, kExprTableSize, 0x00,  // table.size
kExprI32GeS,  // i32.ge_s
kSimdPrefix, kExprI16x8Shl, 0x01,  // i16x8.shl
kExprI32Const, 0x00,  // i32.const
kSimdPrefix, kExprI8x16Splat,  // i8x16.splat
kExprI32Const, 0x68,  // i32.const
kSimdPrefix, kExprI8x16ShrU,  // i8x16.shr_u
kExprI32Const, 0xb3, 0x8a, 0x01,  // i32.const
kSimdPrefix, kExprI8x16ShrU,  // i8x16.shr_u
kSimdPrefix, kExprI32x4Mul, 0x01,  // i32x4.mul
kSimdPrefix, kExprS128Const, 0xfd, 0xde, 0xc7, 0x58, 0x71, 0x0d, 0x07, 0x30, 0x5a, 0xa7, 0x56, 0xb8, 0x3f, 0xdf, 0x9f, 0xbb,  // v128.const
kExprI32Const, 0x5c,  // i32.const
kExprI32Const, 0xc1, 0x00,  // i32.const
kExprRefFunc, 0x00,  // ref.func
kSimdPrefix, kExprS128Const, 0x6f, 0xae, 0xfb, 0x2c, 0x5c, 0xd7, 0xcf, 0xef, 0xed, 0x10, 0xe4, 0x92, 0xee, 0xd7, 0x3e, 0x50,  // v128.const
kExprI32Const, 0x00,  // i32.const
kSimdPrefix, kExprI8x16Splat,  // i8x16.splat
kExprI32Const, 0x00,  // i32.const
kSimdPrefix, kExprI8x16Splat,  // i8x16.splat
kExprI32Const, 0xf7, 0xd3, 0xc2, 0xbf, 0x79,  // i32.const
kExprI32Const, 0x9d, 0xe2, 0xd2, 0x94, 0x7f,  // i32.const
kExprI32DivU,  // i32.div_u
kExprI32Const, 0xe1, 0xc9, 0xe4, 0xfa, 0x02,  // i32.const
kExprI32Const, 0xef, 0xaf, 0xa3, 0xbf, 0x02,  // i32.const
kExprI32Const, 0xad, 0xe2, 0xff, 0xfb, 0x78,  // i32.const
kExprI32Const, 0xd4, 0xe2, 0xf7, 0xf6, 0x00,  // i32.const
kExprI32Const, 0xa2, 0xc0, 0xb7, 0xdb, 0x79,  // i32.const
kExprI32Const, 0x97, 0xe6, 0xc8, 0xeb, 0x78,  // i32.const
kExprRefFunc, 0x01,  // ref.func
kExprCallRef, 0x03,  // call_ref: niiiriniifrnnrr_ssiirsssiiiiiii
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprDrop,  // drop
kExprBlock, 0x40,  // block @170
  kExprTry, 0x7f,  // try @172 i32
    kExprF32Const, 0xa7, 0x59, 0xd5, 0x98,  // f32.const
    kExprI32Const, 0xad, 0xe1, 0x84, 0x92, 0x7c,  // i32.const
    kExprI64Const, 0xfa, 0xda, 0x92, 0x9b, 0xf3, 0x95, 0xd1, 0x83, 0xf0, 0x00,  // i64.const
    kAtomicPrefix, kExprI64AtomicStore32U, 0x02, 0xb5, 0xeb, 0x02,  // i64.atomic.store32
    kExprF32Sqrt,  // f32.sqrt
    kExprF32Sqrt,  // f32.sqrt
    kExprF32Sqrt,  // f32.sqrt
    kExprF32Sqrt,  // f32.sqrt
    kExprF32Sqrt,  // f32.sqrt
    kExprF32Sqrt,  // f32.sqrt
    kExprF32Sqrt,  // f32.sqrt
    kNumericPrefix, kExprI32SConvertSatF32,  // i32.trunc_sat_f32_s
    kExprI32Const, 0xe8, 0xce, 0xbd, 0xf2, 0x7c,  // i32.const
    kAtomicPrefix, kExprI32AtomicXor16U, 0x01, 0xba, 0xea, 0x02,  // i32.atomic.rmw16.xor_u
  kExprCatch, 0x00,  // catch @223
    kExprI32Const, 0xf2, 0xeb, 0x8b, 0xdf, 0x01,  // i32.const
  kExprCatchAll,  // catch_all @231
    kExprI32Const, 0x9a, 0xdb, 0xaf, 0x8a, 0x04,  // i32.const
    kExprEnd,  // end @238
  kExprF32Const, 0xa5, 0xcd, 0x00, 0xff,  // f32.const
  kExprI32Const, 0x8b, 0xf0, 0xe5, 0xb3, 0x07,  // i32.const
  kExprRefNull, 0x70,  // ref.null
  kExprI32Const, 0xc5, 0xfe, 0xb6, 0xd2, 0x78,  // i32.const
  kNumericPrefix, kExprTableFill, 0x00,  // table.fill
  kExprI32Const, 0x85, 0xba, 0xb7, 0xdd, 0x03,  // i32.const
  kExprIf, 0x40,  // if @267
    kExprEnd,  // end @269
  kNumericPrefix, kExprTableSize, 0x00,  // table.size
  kExprI32Const, 0xa2, 0xd4, 0xb6, 0xe4, 0x78,  // i32.const
  kExprI32Const, 0xaf, 0xab, 0xa5, 0xc4, 0x7a,  // i32.const
  kNumericPrefix, kExprTableCopy, 0x00, 0x00,  // table.copy
  kExprLoop, 0x40,  // loop @289
    kExprLoop, 0x40,  // loop @291
      kExprLoop, 0x40,  // loop @293
        kExprLoop, 0x40,  // loop @295
          kExprEnd,  // end @297
        kExprEnd,  // end @298
      kExprEnd,  // end @299
    kExprEnd,  // end @300
  kNumericPrefix, kExprTableSize, 0x00,  // table.size
  kExprIf, 0x7d,  // if @304 f32
    kExprBlock, 0x7d,  // block @306 f32
      kSimdPrefix, kExprS128Const, 0x76, 0xbd, 0xd4, 0x23, 0x7f, 0xbe, 0x8d, 0xae, 0x73, 0x3b, 0x14, 0x20, 0xa0, 0xd1, 0x99, 0xce,  // v128.const
      kSimdPrefix, kExprI16x8ExtractLaneU, 0x00,  // i16x8.extract_lane_u
      kExprF32UConvertI32,  // f32.convert_i32_u
      kExprEnd,  // end @330
  kExprElse,  // else @331
    kExprF32Const, 0xb0, 0x15, 0x1b, 0x66,  // f32.const
    kExprEnd,  // end @337
  kExprF32Min,  // f32.min
  kExprF32Const, 0x54, 0x7a, 0x8a, 0x33,  // f32.const
  kExprI32Const, 0xe6, 0xe2, 0xaf, 0x96, 0x07,  // i32.const
  kExprF32Const, 0xde, 0xa0, 0x88, 0x29,  // f32.const
  kExprF32StoreMem, 0x00, 0x01,  // f32.store
  kExprF32Min,  // f32.min
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32Sqrt,  // f32.sqrt
  kExprF32StoreMem, 0x01, 0x01,  // f32.store
  kExprThrow, 0x00,  // throw
  kExprI32Const, 0xc9, 0x82, 0xc4, 0x9a, 0x02,  // i32.const
  kExprI32Const, 0x00,  // i32.const
  kSimdPrefix, kExprI8x16Splat,  // i8x16.splat
  kExprI32Const, 0xfb, 0x00,  // i32.const
  kSimdPrefix, kExprI8x16ReplaceLane, 0x00,  // i8x16.replace_lane
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kExprI32Const, 0x00,  // i32.const
  kSimdPrefix, kExprI8x16Splat,  // i8x16.splat
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI16x8SConvertI8x16Low, 0x01,  // i16x8.extend_low_i8x16_s
  kSimdPrefix, kExprI32x4MinU, 0x01,  // i32x4.min_u
  kSimdPrefix, kExprS128Store64Lane, 0x00, 0xf5, 0xeb, 0x03, 0x01,  // v128.store64_lane
  kExprEnd,  // end @451
kExprF32CopySign,  // f32.copysign
kExprF32Sqrt,  // f32.sqrt
kExprF32Sqrt,  // f32.sqrt
kNumericPrefix, kExprI32SConvertSatF32,  // i32.trunc_sat_f32_s
kExprEnd,  // end @457
]);
// Generate function 2 (out of 2).
builder.addFunction(undefined, 3 /* sig */)
  .addLocals(wasmRefNullType(kWasmStructRef), 4).addLocals(wasmRefNullType(kWasmI31Ref), 1).addLocals(kWasmS128, 1).addLocals(wasmRefType(0), 1).addLocals(wasmRefType(2), 1).addLocals(wasmRefNullType(1), 1).addLocals(wasmRefType(kWasmI31Ref), 1).addLocals(wasmRefNullType(2), 1).addLocals(kWasmI32, 10)
  .addBodyWithEnd([
// signature: niiiriniifrnnrr_ssiirsssiiiiiii
// body:
kGCPrefix, kExprStructNew, 0x00,  // struct.new
kExprLocalSet, 0x15,  // local.set
kExprRefFunc, 0x00,  // ref.func
kExprLocalSet, 0x16,  // local.set
kExprI32Const, 0xf5, 0xe6, 0xf4, 0xe9, 0x00,  // i32.const
kGCPrefix, kExprRefI31,  // ref.i31
kExprLocalSet, 0x18,  // local.set
kExprRefNull, 0x72,  // ref.null
kExprI32Const, 0xa7, 0xd6, 0x8c, 0xe8, 0x79,  // i32.const
kExprI32Const, 0xe1, 0xaa, 0xb3, 0xfb, 0x01,  // i32.const
kExprI32Const, 0xdd, 0xc2, 0xc6, 0xf6, 0x05,  // i32.const
kExprRefNull, 0x70,  // ref.null
kExprI32Const, 0xf7, 0x80, 0xd1, 0x0e,  // i32.const
kExprI32Const, 0x14,  // i32.const
kExprI32RemS,  // i32.rem_s
kGCPrefix, kExprArrayNew, 0x01,  // array.new
kExprI32Const, 0xa6, 0xe7, 0x83, 0xca, 0x78,  // i32.const
kExprRefNull, 0x6f,  // ref.null
kExprI32Const, 0xea, 0xdd, 0xa8, 0xf5, 0x7b,  // i32.const
kExprI32Const, 0xf5, 0xf5, 0x9a, 0xdb, 0x7a,  // i32.const
kExprF32Const, 0xf6, 0x29, 0x2d, 0x2f,  // f32.const
kExprRefFunc, 0x00,  // ref.func
kExprRefNull, 0x6d,  // ref.null
kExprRefNull, 0x72,  // ref.null
kExprRefFunc, 0x01,  // ref.func
kExprRefNull, 0x6f,  // ref.null
kExprRefAsNonNull,  // ref.as_non_null
kExprEnd,  // end @112
]);
builder.addExport('main', 2);
x = builder.toBuffer()
    

const v4 = new WebAssembly.Module(x);

function foo(){
    // return NaN;
}
const o15 = {
    "foo0": foo,
    "foo1": foo,
};
const o16 = {
    "mod": o15,
};
const v18 = new WebAssembly.Instance(v4, o16);
const t172 = v18.exports.main;
t172(1, 2, 3);
// CRASH INFO
// ==========
// TERMSIG: 11
// STDERR:
// Received signal 11 SEGV_MAPERR 00008f7c0004
// 
// ==== C stack trace ===============================
// 
//  [0x000056db07b9]
//  [0x0000f7fccb70]
//  [0x0000574fcf4c]
//  [0x000058e3619d]
//  [0x000058e35bf0]
//  [0x000059246a97]
//  [0x0000592417bf]
//  [0x0000592655d5]
//  [0x000059265c06]
//  [0x000057428e66]
//  [0x00005742cad4]
//  [0x000056ddce0b]
//  [0x000056ddc6df]
//  [0x000056cb8a95]
//  [0x000056cda8c6]
//  [0x000056ce0180]
//  [0x000056cdf971]
//  [0x000056ce32ce]
//  [0x0000f7c79ed5]
//  [0x000056c7f191]
// [end of stack trace]
