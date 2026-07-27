function f24() {
    function f23() {
        function F40(a42) {
            let v44 = a42.constructor;
            new v44(1.1);
            this.g = a42;
            Object.freeze(this);
        }
        let v50 = new F40(0);
        new F40(v50);
    }

    for (let i = 0; i < 5000000; i++) {
        f23();
    }
}

const workers = [];
for (let i = 0; i < 30; i++) {
    workers.push(new Worker(f24, { type: "function" }));
}

for (const w of workers) {
    try {
        w.getMessage();
    } catch(e) {}
}
