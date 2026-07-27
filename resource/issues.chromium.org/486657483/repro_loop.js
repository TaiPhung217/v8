function make_heapnum(v) { const a=[1.1]; a[0]=v; return a[0]; }

const H0 = make_heapnum(24440.0);
const H1 = make_heapnum(-1.0);

function f() {
  let x = H0;
  for (let i = 0; i < 1; ++i) {
    if (i) x = H1;
    x + 0.25;
  }
  let c = !x; 

  return c;
}

%PrepareFunctionForOptimization(f);
f();
%OptimizeMaglevOnNextCall(f);
f();