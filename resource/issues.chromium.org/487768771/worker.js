onmessage = function(msg) {
  const sab = (msg && typeof msg === "object" && "data" in msg) ? msg.data : msg;
  const max = sab.maxByteLength;
  for (let n = sab.byteLength + 1; n <= max; ++n) {
    sab.grow(n);
  }
};
