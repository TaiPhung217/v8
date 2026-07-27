import io
from abc import ABC

MAGIC = b"\x00\x61\x73\x6d"
VERSION = b"\x01\x00\x00\x00"

class Label:
    def __init__(self, name, contents):
        self.name = name
        self.contents = contents

class WasmWriter:
	def __init__(self, outstream):
		self.out = outstream
		self.labels = {}
		self.position = 0
	def setLabelRel(self, name, offset=0):
		if name not in self.labels:
			self.labels[name] = []
		self.labels[name].append(self.position+offset)
	def unwrapLabel(self, obj):
		while isinstance(obj, Label):
			self.setLabelRel(obj.name)
			obj=obj.contents		
		return obj			
	def write(self, obj):
		obj=self.unwrapLabel(obj)
		if isinstance(obj, bytes):
			self.writeRaw(obj)
		elif isinstance(obj, list):
			self.writeVec(obj)
		elif isinstance(obj, tuple):
			for v in obj:
				self.write(v)
		elif isinstance(obj, bool):
			self.writeByte(int(obj))
		elif isinstance(obj, int):
			self.writeSignedInt(obj)
		elif obj is None:
			return
		else:
			obj.writeTo(self)
	def writeRaw(self, b):
		b=self.unwrapLabel(b)
		self.out.write(b)
		self.position += len(b)
	def writeByte(self, b):
		b=self.unwrapLabel(b)
		self.writeRaw(bytes([b]))
	def writeUnsignedInt(self, n):
		n=self.unwrapLabel(n)
		assert n >= 0, f"Not unsigned: {n}"
		while not n<2**7:
			self.writeByte((n&(2**7-1))|2**7)
			n >>= 7
		self.writeByte(n)
	def writeSignedInt(self, n):
		n=self.unwrapLabel(n)
		while not -2**6 <= n < 2**6:
			self.writeByte((n&(2**7-1))|2**7)
			n >>= 7
		if n >= 0:
			self.writeByte(n)
		else:
			assert -2**6 <= n < 0
			self.writeByte(n+2**7)
	def writeUintN(self, n, v):
		v=self.unwrapLabel(v)
		assert 0 <= v < 2**n, f"{v} does not fit in u{n} range"
		self.writeUnsignedInt(v)
	def writeIntN(self, n, v):
		v=self.unwrapLabel(v)
		assert -2**(n-1) <= v < 2**(n-1), f"{v} does not fit in i{n} range"
		self.writeSignedInt(v)
	def writeU32(self, v):
		v=self.unwrapLabel(v)
		self.writeUintN(32, v)
	def writeI32(self, v):
		v=self.unwrapLabel(v)
		self.writeIntN(32, v)
	def writeU64(self, v):
		v=self.unwrapLabel(v)
		self.writeUintN(64, v)
	def writeI64(self, v):
		v=self.unwrapLabel(v)
		self.writeIntN(64, v)
	def writeVec(self, vec):
		vec=self.unwrapLabel(vec)
		self.writeU32(len(vec))
		for i in vec:
			self.write(i)
	def writeName(self, b):
		b=self.unwrapLabel(b)
		if isinstance(b, str):
			b = b.encode("utf-8")
		self.writeU32(len(b))
		self.writeRaw(b)
	def sub(self):
		return SubWasmWriter(self)

class SubWasmWriter(WasmWriter):
	def __init__(self, parent):
		self.io = io.BytesIO()
		self.parent = parent
		super().__init__(self.io)
	def flush(self):
		for (l,v) in self.labels.items():
			for x in v:
				self.parent.setLabelRel(l,x)
		self.parent.writeRaw(bytes(self.io.getbuffer()))
		self.io.close()
	def length(self):
		return self.io.tell()

class WasmWritable(ABC):
	pass

class I32(WasmWritable):
	def __init__(self, val):
		self.val = val
	def writeTo(self, writer):
		writer.writeI32(self.val)

class U32(WasmWritable):
	def __init__(self, val):
		self.val = val
	def writeTo(self, writer):
		writer.writeU32(self.val)

class I64(WasmWritable):
	def __init__(self, val):
		self.val = val
	def writeTo(self, writer):
		writer.writeI64(self.val)

class U64(WasmWritable):
	def __init__(self, val):
		self.val = val
	def writeTo(self, writer):
		writer.writeU64(self.val)



class WasmModule(WasmWritable):
	def __init__(self, sections=None):
		self.sections = sections or []
	def writeTo(self, writer):
		writer.writeRaw(MAGIC)
		writer.writeRaw(VERSION)
		for s in self.sections:
			writer.write(s)
			
class WasmSection(WasmWritable):
	def __init__(self, _id, contents):
		self.id = _id
		self.contents = contents
	def writeContents(self, writer):
		writer.write(self.contents)
	def writeTo(self, writer):
		writer.writeByte(self.id)
		sub = writer.sub()
		self.writeContents(sub)
		writer.writeU32(sub.length())
		sub.flush()

class CustomSection(WasmSection):
	id = 0
	def __init__(self, name, contents):
		self.name = name
		self.contents = contents
	def writeContents(self, writer):
		writer.writeName(self.name)
		writer.writeRaw(self.contents)

class VectorSection(WasmSection, ABC):
	def __init__(self, vals):
		self.vals = vals
	def writeContents(self, writer):
		writer.writeVec(list(self.vals))
		
class TypeSection(VectorSection):
	id = 1

class FunctionSection(VectorSection):
	id=3

class TableSection(VectorSection):
	id = 4
	
class ExportSection(VectorSection):
	id = 7

class CodeSection(VectorSection):
	id = 10
	
class Export(WasmWritable):
	kind = None
	def __init__(self, name, idx, kind = None):
		self.name = name
		self.idx = idx
		if kind is not None:
			assert self.kind is None, "Can't overwrite export kind"
			self.kind = kind
	def writeTo(self, writer):
		writer.writeName(self.name)
		writer.writeByte(self.kind)
		writer.writeU32(self.idx)

class FuncExport(Export):
	kind = 0
class TableExport(Export):
	kind = 1
class MemExport(Export):
	kind = 2
class GlobalExport(Export):
	kind = 3
	
	
class Code(WasmWritable):
	def __init__(self, expr, locals_=None):
		self.expr = expr
		self.locals = locals_
	def writeTo(self, writer):
		sub = writer.sub()
		sub.writeVec(self.locals or [])
		sub.write(self.expr)
		writer.writeU32(sub.length())
		sub.flush()
	
class Expression(WasmWritable):
	def __init__(self, instructions=None):
		self.instructions = instructions
	def writeTo(self, writer):
		for ins in self.instructions:
			writer.write(ins)
		writer.writeByte(0x0B)

class TableEntry(WasmWritable):
	def __init__(self, type_, initializer=None, limits=None, shared=False):
		self.type = type_
		self.initializer = initializer
		try:
			self.minimum, self.maximum = limits
		except:
			self.minimum = limits
			self.maximum = None
		self.shared = shared
	def writeTo(self, writer):
		if self.initializer is not None:
			writer.writeByte(0x40)
			writer.writeByte(0x00) # reserved
		writer.write(self.type)
		flags = 1 if self.maximum is not None else 0
		if self.shared:
			flags |= 2
		writer.writeByte(flags)
		writer.writeU32(self.minimum or 0)
		if self.maximum is not None:
			writer.writeU32(self.maximum)
		if self.initializer is not None:
			writer.write(self.initializer)

class RecursiveGroup(WasmWritable):
	def __init__(self, types):
		self.types = types
	def writeTo(self, writer):
		writer.writeByte(0x4e)
		writer.writeVec(self.types)
		

tVoid = b"\x40"
tI32 = b"\x7f"
tI64 = b"\x7e"	
tF32 = b"\x7d"
tF64 = b"\x7c"
tS128 = b"\x7b"
tI8 = b"\x78"
tI16 = b"\x77"
tNoExn = b"\x74"
tNoFunc = b"\x73"
tNoExtern = b"\x72"
tNone = b"\x71"
tFuncRef = b"\x70"
tExternRef = b"\x6f"
tAnyRef = b"\x6e"
tEqRef = b"\x6d"
tI31Ref = b"\x6c"
tStructRef = b"\x6b"
tArrayRef = b"\x6a"
tRef = b"\x64"
tRefNull = b"\x63"


i64Add = b"\x7C"
i64Sub = b"\x7D"
constI32 = lambda n:(b"\x41",I32(n))
constI64 = lambda n:(b"\x42",I64(n))
constU64 = lambda n:(b"\x42",U64(n))
structNew = lambda idx:(b"\xFB",U32(0),U32(idx))
structNewDefault = lambda idx:(b"\xFB",U32(1),U32(idx))
structGet = lambda typeidx,fieldidx:(b"\xFB",U32(2),U32(typeidx),U32(fieldidx))
structSet = lambda typeidx,fieldidx:(b"\xFB",U32(5),U32(typeidx),U32(fieldidx))
localSet = lambda idx: (b"\x21",U32(idx))
localGet = lambda idx: (b"\x20",U32(idx))
castRef = lambda typeidx: (b"\xFB",U32(22),U32(typeidx))
arrayLen = (b"\xFB",U32(15))
arrayNew = lambda typeidx:(b"\xFB",U32(6),U32(typeidx))
arrayNewDefault = lambda typeidx:(b"\xFB",U32(7),U32(typeidx))
arrayGet = lambda typeidx:(b"\xFB",U32(11),U32(typeidx))
arraySet = lambda typeidx:(b"\xFB",U32(14),U32(typeidx))


kI31 = 1000002
ref = lambda heap_type: (tRef, heap_type)
refNull = lambda heap_type: (tRefNull, heap_type)
funcRef = lambda n: (tFuncRef, n)

funcType = lambda params, results: (b"\x60", list(params), list(results))
structType = lambda fields: (b"\x5f", [(tp, bool(mut)) for (tp,mut) in fields])
arrayType = lambda field,mut: (b"\x5E",field,bool(mut))

