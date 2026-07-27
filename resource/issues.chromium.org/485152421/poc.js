function AsmModule(stdlib, foreign, heap) {
  "use asm";
  var HEAP32 = new stdlib.Int32Array(heap);
  function g() { return 1.25; }
  function trigger(a,b,c) {
    a=a|0; b=b|0; c=c|0;
    HEAP32[a << (b >> 2) + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g() + ~~+g()] = c;
  }
  return {trigger:trigger, g:g};
}
var heap = new ArrayBuffer(0x10000);
var m = AsmModule({Int32Array:Int32Array}, {}, heap);
print(m.g());
m.trigger(1,8,7);
print('done');
