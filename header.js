include = function(relpath){
	document.write("<script type='text/javascript' src=" + relpath + " charset='UTF-8'></script>");
}
include("./ext.js");
include("./api.js");
include("./decoder.js");
include("./memory.js");
include("./instrbas.js");
include("./instr.js");
include("./webcpu.js");
include("./const.js");