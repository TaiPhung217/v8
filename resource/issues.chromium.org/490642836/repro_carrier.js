"use strict";

const variant = arguments[0] || "carrier_decl";
const start = Number(arguments[1] || 100);
const end = Number(arguments[2] || 1200);
const step = Number(arguments[3] || 50);

function makeDeepSwitchScopeChain(n) {
  let s = "0;";
  for (let i = 0; i < n; i++) {
    s = `switch (1) { case 0: let x; ${s} }`;
  }
  return s;
}

function makeDeepPlainSwitchChain(n) {
  let s = "0;";
  for (let i = 0; i < n; i++) {
    s = `switch (1) { case 0: ${s} }`;
  }
  return s;
}

function makeCarrierDecl(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  INNER: {
    function g() { return 0; }
    break INNER;
    ${deep}
  }
}
`;
}

function makeCarrierExpr(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  INNER: {
    (() => 0);
    break INNER;
    ${deep}
  }
}
`;
}

function makeTryCatchDecl(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
switch (1) {
  case 0:
    let x;
    0;
    try { ${deep} } catch (e) {}
    {
      function g() { return 0; }
      g;
    }
}
`;
}

function makeTryCatchExpr(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
switch (1) {
  case 0:
    let x;
    0;
    try { ${deep} } catch (e) {}
    { (() => 0); }
}
`;
}

function makeLabelTryDecl(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
L: {
  try { ${deep} } catch (e) {}
  {
    function g() { return 0; }
    g;
  }
  break L;
}
`;
}

function makeLabelTryExpr(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
L: {
  try { ${deep} } catch (e) {}
  { (() => 0); }
  break L;
}
`;
}

function makeIfDecl(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
globalThis.p = 1;
if (globalThis.p) {
  function g() { return 0; }
  g;
} else {
  ${deep}
}
`;
}

function makeIfExpr(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
globalThis.p = 1;
if (globalThis.p) {
  (() => 0);
} else {
  ${deep}
}
`;
}

function makeIfDirectSwitchExpr(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
globalThis.p = true;
if (globalThis.p)
  (() => 0);
else
  ${deep}
`;
}

function makeIfDirectPlainSwitchExpr(n) {
  const deep = makeDeepPlainSwitchChain(n);
  return `
globalThis.p = true;
if (globalThis.p)
  (() => 0);
else
  ${deep}
`;
}

function makeDeepPlainIfChain(n) {
  let s = "0;";
  for (let i = 0; i < n; i++) {
    s = `if (globalThis.q) 0; else ${s}`;
  }
  return s;
}

function makeDeepWithChain(n) {
  let s = "0;";
  for (let i = 0; i < n; i++) {
    s = `with ({}) ${s}`;
  }
  return s;
}

function makeIfDeclPlainSwitch(n) {
  const deep = makeDeepPlainSwitchChain(n);
  return `
globalThis.p = true;
if (globalThis.p) {
  function g() { return 0; }
} else
  ${deep}
`;
}

function makeIfDeclPlainIf(n) {
  const deep = makeDeepPlainIfChain(n);
  return `
globalThis.p = true;
globalThis.q = false;
if (globalThis.p) {
  function g() { return 0; }
} else
  ${deep}
`;
}

function makeIfDeclWith(n) {
  const deep = makeDeepWithChain(n);
  return `
globalThis.p = true;
if (globalThis.p) {
  function g() { return 0; }
} else
  ${deep}
`;
}

function makeOuterDupDonorDeclSwitch(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  {
    function g() { return 0; }
    g;
    if (1) 0; else ${deep}
  }
}
`;
}

function makeOuterDupDonorDeclSwitch2(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  0;
  {
    function g() { return 0; }
    g;
    if (1) 0; else ${deep}
  }
}
`;
}

function makeOuterDupDonorExprSwitch(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  {
    (() => 0);
    if (1) 0; else ${deep}
  }
}
`;
}

function makeOuterDupDonorExprSwitch2(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  0;
  {
    (() => 0);
    if (1) 0; else ${deep}
  }
}
`;
}

function makeOuterDupDonorDeclSwitchCall(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  {
    function g() { return 0; }
    g();
    if (1) 0; else ${deep}
  }
}
`;
}

function makeOuterDupDonorDeclSwitch2Call(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  0;
  0;
  {
    function g() { return 0; }
    g();
    if (1) 0; else ${deep}
  }
}
`;
}

function shouldUseIndirectEval(name) {
  return name.includes("_with");
}

function makeSwitchTryBreak(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
switch (1) {
  case 0:
    let x;
    try { ${deep} } catch (e) {}
    break;
    0;
}
`;
}

function makeLabelTryBreak(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
OUT: {
  try { ${deep} } catch (e) {}
  break OUT;
  0;
}
`;
}

function makeLoopSwitchTryContinue(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
LOOP: while (0) {
  switch (1) {
    case 0:
      let x;
      try { ${deep} } catch (e) {}
      continue LOOP;
      0;
  }
}
`;
}

function makeLoopSwitchTryContinueDyn(n) {
  const deep = makeDeepSwitchScopeChain(n);
  return `
globalThis.p = false;
LOOP: while (globalThis.p) {
  switch (1) {
    case 0:
      let x;
      try { ${deep} } catch (e) {}
      continue LOOP;
      0;
  }
}
`;
}

const builders = {
  carrier_decl: makeCarrierDecl,
  carrier_expr: makeCarrierExpr,
  try_catch_decl: makeTryCatchDecl,
  try_catch_expr: makeTryCatchExpr,
  label_try_decl: makeLabelTryDecl,
  label_try_expr: makeLabelTryExpr,
  if_decl: makeIfDecl,
  if_expr: makeIfExpr,
  if_direct_switch_expr: makeIfDirectSwitchExpr,
  if_direct_plain_switch_expr: makeIfDirectPlainSwitchExpr,
  if_decl_plain_switch: makeIfDeclPlainSwitch,
  if_decl_plain_if: makeIfDeclPlainIf,
  if_decl_with: makeIfDeclWith,
  outer_dup_donor_decl_switch: makeOuterDupDonorDeclSwitch,
  outer_dup_donor_decl_switch2: makeOuterDupDonorDeclSwitch2,
  outer_dup_donor_expr_switch: makeOuterDupDonorExprSwitch,
  outer_dup_donor_expr_switch2: makeOuterDupDonorExprSwitch2,
  outer_dup_donor_decl_switch_call: makeOuterDupDonorDeclSwitchCall,
  outer_dup_donor_decl_switch2_call: makeOuterDupDonorDeclSwitch2Call,
  switch_try_break: makeSwitchTryBreak,
  label_try_break: makeLabelTryBreak,
  loop_switch_try_continue: makeLoopSwitchTryContinue,
  loop_switch_try_continue_dyn: makeLoopSwitchTryContinueDyn,
};

if (!(variant in builders)) {
  throw new Error(`unknown variant: ${variant}`);
}

function isExpectedStackFailure(error) {
  const text = String(error);
  return text.includes("stack") || text.includes("too much recursion");
}

for (let n = start; n <= end; n += step) {
  const src = builders[variant](n);
  print(`TRY ${variant} n=${n} len=${src.length}`);
  try {
    if (shouldUseIndirectEval(variant)) {
      (0, eval)(src);
    } else {
      eval(src);
    }
  } catch (e) {
    if (isExpectedStackFailure(e)) {
      print(`STACK ${variant} n=${n}: ${e.name}: ${e.message}`);
      continue;
    }
    print(`UNEXPECTED ${variant} n=${n}: ${e.name}: ${e.message}`);
    throw e;
  }
}

print(`DONE ${variant}`);
