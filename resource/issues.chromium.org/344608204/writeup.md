# TyphoonPWN 2024 Whitepaper

Submitted by Seunghyun Lee (Xion, @0x10n)


## Target

Google Chrome RCE (no sandbox)


## Repro (Minimal PoC)

1. Run a webserver to serve the given `poc.html` file (e.g. `python3 -m http.server -b 127.0.0.1 8000`)
   - `poc.js`, `wasm-module-builder.js` should also be served together from the same path
2. Start Chrome
3. Browse to `http://127.0.0.1:8000/poc.html`

Result should be an immediate crash with `STATUS_ACCESS_VIOLATION`.


## Repro (RCE)

1. Run a webserver to serve the given `exp.html` file (e.g. `python3 -m http.server -b 127.0.0.1 8000`)
   - ~~`exp.js`, `wasm-module-builder.js` should also be served together from the same path~~
   - Corresponding script files are inlined into `exp.html` due to potential caching issues
2. Start Chrome with `--no-sandbox` flag
3. Browse to `http://127.0.0.1:8000/exp.html`

Result should be a command prompt opening with arbitrary commands executed (`echo`ing of some ASCII art).


## TL;DR

WASM isorecursive canonical type id <-> `wasm::HeapType` / `wasm::ValueType` confusion in JS-to-WASM conversion functions and their wrappers (`FromJS()`, `(Wasm)JSToWasmObject()`, etc.), resulting in type confusion between arbitrary WASM types.

This can be considered a variant bug of [CVE-2024-2887](https://www.zerodayinitiative.com/blog/2024/5/2/cve-2024-2887-a-pwn2own-winning-bug-in-google-chrome) discovered by Manfred Paul and presented in Pwn2Own Vancouver 2024.


## Bug / Root Cause Analysis

[Types in WasmGC](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md) are canonicalized to allow cross-module type checking. As WasmGC allows isorecursive types, type comparison between types from each of their own recursive groups located in different modules needs to be supported. V8 implements this by "canonicalizing" all types from all modules in a single isolate into a uniquely identified `uint32_t` index. This process is implemented in https://source.chromium.org/chromium/chromium/src/+/main:v8/src/wasm/canonical-types.cc, but a very simple TL;DR would be:

1. Canonicalize type indexes in a recursive group by the following rule:
   1. Type indexes already defined (outside of its recursive group) -> use the already canonicalized value
   2. Type indexes representing a different type within the same group -> compute relative type index from the first type and mark as relative
2. If the canonicalized recursive group already exists in the database, use the saved indexes
3. Else, save the recursive group into the database and create new indexes (incrementally)

In this way, WasmGC supports a notion of structural type equivalence - i.e. `(type $t1 (struct (mut i32) (mut i64)))` from module M1 is equivalent to `(type $t2 (struct (mut i32) (mut i64)))` from module M2 when canonicalized in any order, extend this to more complex recursive groups and the idea still holds.

The global canonicalization database is managed by a singleton class `TypeCanonicalizer`:

```cpp
TypeCanonicalizer* GetTypeCanonicalizer() {
  return GetWasmEngine()->type_canonicalizer();
}

class TypeCanonicalizer {
 public:
  static constexpr uint32_t kPredefinedArrayI8Index = 0;
  static constexpr uint32_t kPredefinedArrayI16Index = 1;
  static constexpr uint32_t kNumberOfPredefinedTypes = 2;
  //...
 private:
  //...
  std::vector<uint32_t> canonical_supertypes_;
  // Maps groups of size >=2 to the canonical id of the first type.
  std::unordered_map<CanonicalGroup, uint32_t, base::hash<CanonicalGroup>>
      canonical_groups_;
  // Maps group of size 1 to the canonical id of the type.
  std::unordered_map<CanonicalSingletonGroup, uint32_t,
                     base::hash<CanonicalSingletonGroup>>
      canonical_singleton_groups_;
  // ...
};
```

A canonical type id is a globally unique id of type `uint32_t` representing the specific WasmGC type within the isolate. `canonical_supertypes_` is a vector representing the subtyping relationship between types, where `canonical_supertypes_[sub] = super` represents that `super` is the supertype of `sub` (all in canonical type ids).

Each WASM module saves a vector to convert its internal type index to the canonicalized type index:

```cpp
struct V8_EXPORT_PRIVATE WasmModule {
  //...
  std::vector<TypeDefinition> types;  // by type index
  // Maps each type index to its global (cross-module) canonical index as per
  // isorecursive type canonicalization.
  std::vector<uint32_t> isorecursive_canonical_type_ids;
  //...
}
```

In this case, `isorecursive_canonical_type_ids[t] = c` means that the type index `t` is canonicalized into the type id `c`.

Note that the maximum number of type index `t` that a single WASM module can have is `kV8MaxWasmTypes`, which is `1000000`. This is enforced in the decoding phase, [`DecodeTypeSection()`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/wasm/module-decoder-impl.h;l=619). However, an important observation is that canonical type id is not bound to `kV8MaxWasmTypes` in any way - it can grow as much as the host memory supports, as we can simply make more WASM modules with different types.

A quick xref to see how `isorecursive_canonical_type_ids` is used returns [`WasmWrapperGraphBuilder::FromJS()`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/compiler/wasm-compiler.cc;l=7311), runtime function [`WasmJSToWasmObject()`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/runtime/runtime-wasm.cc;l=186) calling into [`JSToWasmObject()`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/wasm/wasm-objects.cc;l=2551), etc. Taking a look into the former we see the following code:

```cpp
  Node* FromJS(Node* input, Node* js_context, wasm::ValueType type,
               const wasm::WasmModule* module, Node* frame_state = nullptr) {
    switch (type.kind()) {
      case wasm::kRef:
      case wasm::kRefNull: {
        switch (type.heap_representation_non_shared()) {
          //...
          case wasm::HeapType::kNone:
          case wasm::HeapType::kNoFunc:
          case wasm::HeapType::kI31:
          case wasm::HeapType::kAny:
          case wasm::HeapType::kFunc:
          case wasm::HeapType::kStruct:
          case wasm::HeapType::kArray:
          case wasm::HeapType::kEq:
          default: {
            // Make sure ValueType fits in a Smi.
            static_assert(wasm::ValueType::kLastUsedBit + 1 <= kSmiValueSize);

            if (type.has_index()) {
              DCHECK_NOT_NULL(module);
              uint32_t canonical_index =
                  module->isorecursive_canonical_type_ids[type.ref_index()];
              type = wasm::ValueType::RefMaybeNull(canonical_index,           // [!] canonical type id used as wasm::HeapType
                                                   type.nullability());
            }

            Node* inputs[] = {
                input, mcgraph()->IntPtrConstant(
                           IntToSmi(static_cast<int>(type.raw_bit_field())))};

            return BuildCallToRuntimeWithContext(Runtime::kWasmJSToWasmObject,
                                                 js_context, inputs, 2);
          }
        }
      }
      //...
    }
  }
```

On a JS-to-Wasm conversion boundary, this function is set up to run. Note how the canonical index `canonical_index` of the ref'd type is wrapped into `wasm::ValueType::RefMaybeNull()` and passed to the runtime function `WasmJSToWasmObject()` eventually reaching `JSToWasmObject()`.

`wasm::ValueType` is defined as the following:

```cpp
// A ValueType is encoded by two components: a ValueKind and a heap
// representation (for reference types/rtts). Those are encoded into 32 bits
// using base::BitField. The underlying ValueKind enumeration includes four
// elements which do not strictly correspond to value types: the two packed
// types i8 and i16, the void type (for control structures), and a bottom value
// (for internal use).
// ValueType encoding includes an additional bit marking the index of a type as
// relative. This should only be used during type canonicalization.
class ValueType {
 public:
  //...
  static constexpr ValueType RefMaybeNull(uint32_t heap_type,
                                          Nullability nullability) {
    DCHECK(HeapType(heap_type).is_valid());
    return ValueType(
        KindField::encode(nullability == kNullable ? kRefNull : kRef) |
        HeapTypeField::encode(heap_type));                                          // [!]
  }
  //...
  /**************************** Static constants ******************************/
  static constexpr int kLastUsedBit = 25;
  static constexpr int kKindBits = 5;
  static constexpr int kHeapTypeBits = 20;

  static const intptr_t kBitFieldOffset;

 private:
  // {hash_value} directly reads {bit_field_}.
  friend size_t hash_value(ValueType type);

  using KindField = base::BitField<ValueKind, 0, kKindBits>;
  using HeapTypeField = KindField::Next<uint32_t, kHeapTypeBits>;                   // [!] HeapType, 20 bits wide
  // Marks a type as a canonical type which uses an index relative to its
  // recursive group start. Used only during type canonicalization.
  using CanonicalRelativeField = HeapTypeField::Next<bool, 1>;
  //...
}
```

We now clearly see that the `heap_type` isn't actually designed to store a canonical type id ranging a full `uint32_t`, but instead is designed to store `wasm::HeapType` - there is a confusion between the two type representations (canonicalized type id vs. type index). As `wasm::HeapType` can always be represented with 20bits, the initializer (and getters, omitted in the snippet) always truncate this value to 20bits.

This results in the first exploitable vulnerability - JS-to-Wasm type check may confuse canonical type ids `t1` and `t2` if `(t1 & 0xfffff) == (t2 & 0xfffff)`. Specifically, for a JS-to-Wasm boundary that is typechecked to receive objects of canonical type id `tn = t0 + 0x100000 * n` where `0 < t0 < 0x100000`, it instead performs a runtime type check with the truncated `t0` instead. Simply put, objects of type `t0` and its subtypes can bypass type checks against `tn` and pass the JS-to-Wasm conversion, resulting in further type confusion.

But there is another exploitable vulnerability, much more simpler than working with index wraparounds. The code confuses canonical type id with `wasm::HeapType`, so could there be cases where the canonical type id is misused as a `wasm::HeapType`? Of course there is, follow through the call chain to reach `JSToWasmObject()`:

```cpp
class HeapType {
 public:
  enum Representation : uint32_t {
    kFunc = kV8MaxWasmTypes,  // shorthand: c
    kEq,                      // shorthand: q
    kI31,                     // shorthand: j
    kStruct,                  // shorthand: o
    kArray,                   // shorthand: g
    kAny,                     //                                    // [!] top type ("any")
    kExtern,                  // shorthand: a.
    //...
  };
  //...
}

namespace wasm {
MaybeHandle<Object> JSToWasmObject(Isolate* isolate, Handle<Object> value,
                                   ValueType expected_canonical,
                                   const char** error_message) {
  //...
  switch (expected_canonical.heap_representation_non_shared()) {
    //...
    case HeapType::kAny: {                                          // [!] all non-null JS values allowed
      if (IsSmi(*value)) return CanonicalizeSmi(value, isolate);
      if (IsHeapNumber(*value)) {
        return CanonicalizeHeapNumber(value, isolate);
      }
      if (!IsNull(*value, isolate)) return value;
      *error_message = "null is not allowed for (ref any)";
      return {};
    }
    //...
  }
  //...
}
```

This results in the second, simpler vulnerability - JS-to-Wasm type check is confusing the (truncated) canonical type id as a `wasm::HeapType`. This allows all types with canonical type id in the form of `tn = kAny + 0x100000 * n` (where `kAny = 1000005`) to allow all subtypes of `any`, and since `any` is a top type this includes everything (except null, which we don't need anyways).


## Exploit

We have a very simple but strong exploitation primitive, as we have arbitrary type confusion between WASM objects. Exploiting this to obtain basic exploit constructs such as caged RW, `addrOf()`, `fakeObj()` is explained well in https://www.zerodayinitiative.com/blog/2024/5/2/cve-2024-2887-a-pwn2own-winning-bug-in-google-chrome - a short summary would be to cause confusion between `(type $t1 (struct (mut i32)))`, `(type $t2 (struct (ref $t1)))` and `(type $t3 (struct (exnref)))` (each corresponding to `int`, `int*`, `jsobj`).

Now the remaining piece is to escape the v8 heap sandbox. Contrary to the abscence of publicly known techniques, escaping the v8 heap sandbox still seems to be a trivial task - abuse PartitionAlloc.

### Abusing PartitionAlloc Metadata for Arbitrary Address Write

PartitionAlloc seems to be an under-examined attack vector for v8 heap sandbox escapes, possibly because it is not included in the 4GB v8 pointer compression cage. However, it is still within the 1TB v8 heap sandbox easily accessible (pointer compression cage <-> heap sandbox is not a security boundary) and is rich with external pointers which are used directly without any meaningful mitigation in place.

By modifying `ArrayBuffer` object fields (by `addrOf()` + `caged_write()`), specifically the [`backing_store`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/objects/js-array-buffer.h;l=48) field, it is easy to gain control over PartitionAlloc metadata. This immediately results in `chrome.dll` address leak from `SlotSpanMetadata::bucket`.

```cpp
struct SlotSpanMetadata {
 private:
  PartitionFreelistEntry* freelist_head = nullptr;

 public:
  // TODO(lizeb): Make as many fields as possible private or const, to
  // encapsulate things more clearly.
  SlotSpanMetadata* next_slot_span = nullptr;
  PartitionBucket* const bucket = nullptr;                                        // [!] chrome.dll address leak

  // CHECK()ed in AllocNewSlotSpan().
  // The maximum number of bits needed to cover all currently supported OSes.
  static constexpr size_t kMaxSlotsPerSlotSpanBits = 13;
  static_assert(kMaxSlotsPerSlotSpan < (1 << kMaxSlotsPerSlotSpanBits), "");

  // |marked_full| isn't equivalent to being full. Slot span is marked as full
  // iff it isn't on the active slot span list (or any other list).
  uint32_t marked_full : 1;
  // |num_allocated_slots| is 0 for empty or decommitted slot spans, which can
  // be further differentiated by checking existence of the freelist.
  uint32_t num_allocated_slots : kMaxSlotsPerSlotSpanBits;
  uint32_t num_unprovisioned_slots : kMaxSlotsPerSlotSpanBits;

 private:
  const uint32_t can_store_raw_size_ : 1;
  uint32_t freelist_is_sorted_ : 1;
  uint32_t unused1_ : (32 - 1 - 2 * kMaxSlotsPerSlotSpanBits - 1 - 1);
  // If |in_empty_cache_|==1, |empty_cache_index| is undefined and mustn't be
  // used.
  uint16_t in_empty_cache_ : 1;
  uint16_t empty_cache_index_
      : kMaxEmptyCacheIndexBits;  // < kMaxFreeableSpans.
  uint16_t unused2_ : (16 - 1 - kMaxEmptyCacheIndexBits);
  // Can use only 48 bits (6B) in this bitfield, as this structure is embedded
  // in PartitionPage which has 2B worth of fields and must fit in 32B.
  //...
}
```

As the `bucket` would be later dereferenced and written on, we target this field. Below is a code snippet involved in freeing an object:

```cpp
PA_ALWAYS_INLINE void SlotSpanMetadata::Free(
    uintptr_t slot_start,
    PartitionRoot* root,
    const PartitionFreelistDispatcher* freelist_dispatcher)
    // PartitionRootLock() is not defined inside partition_page.h, but
    // static analysis doesn't require the implementation.
    PA_EXCLUSIVE_LOCKS_REQUIRED(PartitionRootLock(root)) {
  //...
  if (PA_UNLIKELY(marked_full || num_allocated_slots == 0)) {
    FreeSlowPath(1);                                            // [!] target path
  } else {
    // All single-slot allocations must go through the slow path to
    // correctly update the raw size.
    PA_DCHECK(!CanStoreRawSize());
  }
}

void SlotSpanMetadata::FreeSlowPath(size_t number_of_freed) {
  //...
  if (marked_full) {
    //...
    marked_full = 0;
    //...
    if (PA_LIKELY(bucket->active_slot_spans_head != get_sentinel_slot_span())) {
      next_slot_span = bucket->active_slot_spans_head;
    }
    bucket->active_slot_spans_head = this;                      // [!] arbitrary address write
    PA_CHECK(bucket->num_full_slot_spans);  // Underflow.       // [!] constraint
    --bucket->num_full_slot_spans;                              // [!] arbitrary address decr (24bit int)
  }

  if (PA_LIKELY(num_allocated_slots == 0)) {
    //...
    if (PA_LIKELY(this == bucket->active_slot_spans_head)) {
      bucket->SetNewActiveSlotSpan();
    }
    //...
  }
}

bool PartitionBucket::SetNewActiveSlotSpan() {
  //...
  for (; slot_span; slot_span = next_slot_span) {
    next_slot_span = slot_span->next_slot_span;                 // [!] constraint: target should be zero
    //...
    if (slot_span->is_active()) {                               // [!] constraint: false on zeros
      //...
    } else if (slot_span->is_empty()) {                         // [!] arbitrary write
      slot_span->next_slot_span = empty_slot_spans_head;
      empty_slot_spans_head = slot_span;
    } else if (PA_LIKELY(slot_span->is_decommitted())) {
      slot_span->next_slot_span = decommitted_slot_spans_head;  // [!] arbitrary write
      decommitted_slot_spans_head = slot_span;
    } else {
      //...
    }
  }
  //...
}
```

By modifying the `bucket` field and setting up the `marked_full` bit in the slot span metadata, we can reach the code in `FreeSlowPath()` where we can achieve arbitrary address write with written value being the metadata address. Note the immediate `PA_CHECK()` - this is a constraint that our target address must satisfy. Arbitrary address decrement immediately follows afterwards, which can also be used as desired (e.g. shifting JIT code address from `CodePointerTable`s).

This primitive can be used to do whatever one desires, and completely arbitrary values can even be created out of thin air - once the `PA_CHECK()` constraint is satisfied from an adjacent higher address, we can even "pull" the value down by repeatedly decrementing down one by one to where we wish to write, then repeatedly trigger the decrement to create arbitrary value.

We can also take the `PartitionBucket::SetNewActiveSlotSpan()` path where `this` is the attacker-controlled `PartitionBucket*`. This allows arbitrary write with arbitrary value on a target pointer which already has NULL written in it (plus a few more constraints that is easy to satisfy). This supplements the above primitive in the case where we wish to write arbitrary values in the middle of a vast region of zeros, where the `PA_CHECK(bucket->num_full_slot_spans)` may be difficult to satisfy.

### Popping Shell

We've bypassed the v8sbx by the arbitrary address write primitive, and the remaining is just using the exploit primitive to pop shell.

Full RCE is obtained by hijacking the `CodePointerTable` located just in front of the `Sandbox` object.
1. Prepare ropchain, shellcode, etc. as required
2. Overwrite the CPT function table base to our controlled ArrayBuffer filled with our pivot gadget
3. Trigger code that invokes calls through CPT to call the pivot gadget (`JSEntry()` is the simplest one)
   - Gadget pivots the stack to ropchain, which sets shellcode region to executable and returns to shellcode


## Affected Version

All Chrome builds with WasmGC available by default, which is M112 up to latest (M112 ~ M118 behind Origin Trials, later shipped in M119~). Bug likely introduced by commit [ea69507](https://chromiumdash.appspot.com/commit/ea695079e5c3b454eba5762d18994d85f774d1bb) in M110.


## Fix

1. Use and pass canonical type ids as a full `uint32_t` value
   - Stop abusing `wasm::HeapType` to represent canonical type ids
     - `wasm::HeapType`: 20-bit wide, module-defined types are bounded by `kV8MaxWasmTypes`
     - Canonical type id: A full `uint32_t` value only bounded by host memory limitations
   - Define a new `wasm::CanonicalType` to represent canonical type ids to avoid future mixups
     - Canonical type id is currently just a `uint32_t` value which could easily be misused as another type (especially as `wasm::HeapType`)
2. Mitigate PartitionAlloc metadata corruption to prevent v8 sandbox escapes
   - Use `ExternalPointerTable` or similar mechanism (`TrustedPointerTable`?) to represent `bucket`
3. Sanity check canonical type id non-overflow
   - Add a `CHECK()` so that the `canonical_supertypes_` vector never grows larger than 2^32 in length \
     (Requires roughly over 200GB RAM on the target host, so an overflow may not happen in practice)
