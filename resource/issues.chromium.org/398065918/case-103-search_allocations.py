import random
import subprocess

BATCHES = 10
RES = 'tmp_{}.js'

with open('poc_template.js') as f_t:
    data = f_t.read()

def get_args(j):
    simple_vars_cnt = random.randint(0, 300)
    proxy_vars_cnt = random.randint(0, 5)
    # simple_vars_cnt = j % 400
    # proxy_vars_cnt = j // 400
    print(f'===={simple_vars_cnt}==== ===={proxy_vars_cnt}====')

    args = '\n'.join([f'var my_simple_var_{i};' for i in range(simple_vars_cnt)])
    args += '\n'
    args += '\n'.join([f'var my_proxy_var_{i} = new Proxy({{}}, {{}});' for i in range(proxy_vars_cnt)])
    
    return args

i = 0
j = 0
while True:
    for b in range(BATCHES):
        args = get_args(j)
        j += 1
        print(f'args:\n{args}')

        with open(RES.format(b), 'w') as f:
            data_tmp = data
            data_tmp = data_tmp.replace('ARGUMENTS_VARS', args)
            f.write(data_tmp)

    isolate_batches = ' '.join(['--isolate ' + RES.format(x) for x in range(BATCHES)])
    # code = subprocess.call('./d8 --allow-natives-syntax --expose-gc --gdbjit-full --hash-seed=12347 --maglev-loop-peeling-max-size=200 --no-js-atomics-pause --no-opt --no-script-context-mutable-heap-number --no-use_osr --predictable --random-seed=12347 --single-threaded --stress-maglev --turbofan --wasm-staging ' + isolate_batches, shell=True)
    # code = subprocess.call('./d8 --allow-natives-syntax --no-js-atomics-pause --no-script-context-mutable-heap-number --predictable --wasm-staging ' + isolate_batches, shell=True)
    code = subprocess.call('./d8 --allow-natives-syntax --predictable ' + isolate_batches, shell=True)
    if code != 0:
        input('FOUND! Press Enter to continue')

    i += 1
