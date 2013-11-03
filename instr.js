//
// Instructions
//

//未定義の命令(WebCPU_Instructionと同値)
var WebCPU_Instruction_Undefined = WebCPU_Instruction;

var WebCPU_Instruction_NOP = function(instrID){
	//何もしない命令
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		return 1;
	},
	instruction: function(env){
		//no operation
	},
	createBinaryString: function(env){
		return "00";
	},
	toString: function(){
		return "NOP();";
	},
});

var WebCPU_Instruction_LB = function(instrID){
	//ラベル定義命令
	this.opt = 0;
	this.imm32 = null;
	this.passCount = 0;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1), 
			this.fetchSignedInteger(argBinStr, baseIndex, 1, 4)
		);
		return 6;
	},
	setParameter: function(opt, labelID){
		this.opt = opt;
		this.imm32 = labelID;
	},
	instruction: function(env){
		this.passCount++;
	},
	createBinaryString: function(env){
		return "01" + toHexString8(this.opt) + toHexString32(this.imm32);
	},
	toString: function(){
		return this.makeBinaryOperandString("LB", "opt:0x", this.opt, "0x", this.imm32);
	},
});

var WebCPU_Instruction_LIMM = function(instrID){
	//定数即値代入命令
	this.reg0 = 0;
	this.imm32 = 0;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1),
			this.fetchSignedInteger(argBinStr, baseIndex, 1, 4)
		);
		return 6;
	},
	setParameter: function(destReg, imm32){
		this.reg0 = destReg;
		this.imm32 = imm32;
	},
	instruction: function(env){
		env.registers.Integer[this.reg0] = this.imm32;
	},
	createBinaryString: function(env){
		return "02" + toHexString8(this.reg0) + toHexString32(this.imm32);
	},
	toString: function(){
		return this.makeBinaryOperandString("LIMM", "R", this.reg0, "0x", this.imm32);
	},
});

var WebCPU_Instruction_PLIMM = function(instrID){
	//ラベル番号代入命令
	this.reg0 = 0;
	this.imm32 = 0;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1),
			this.fetchSignedInteger(argBinStr, baseIndex, 1, 4)
		);
		return 6;
	},
	setParameter: function(destReg, imm32){
		this.reg0 = destReg;
		this.imm32 = imm32;
	},
	instruction: function(env){
		var m = env.mainMemory.getMemoryPageInstanceFromLabelNumber(this.imm32);
		if(m === undefined){
			throw new WebCPU_Exception(2, ["Label#0x" + this.imm32.toString(16).toUpperCase() + " notfound."]);
		} else{
			env.registers.Pointer[this.reg0] = new WebCPU_Pointer(m);
			if(this.reg0 == 0x3F){
				//goto
				env.memoryPageCounter = env.mainMemory.getMemoryPageCountFromMemoryPageInstance(m);
				env.memoryInstructionCounter = 0;
				env.message("JMP:page " + env.memoryPageCounter+ "\n", 20);
			}
		}
	},
	createBinaryString: function(env){
		return "03" + toHexString8(this.reg0) + toHexString32(this.imm32);
	},
	toString: function(){
		return this.makeBinaryOperandString("PLIMM", "P", this.reg0, "0x", this.imm32);
	},
});

var WebCPU_Instruction_CND = function(instrID){
	//条件実行プリフィクス命令
	this.reg0R = 0;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1)
		);
		return 2;
	},
	setParameter: function(reg){
		this.reg0R = reg;
	},
	instruction: function(env){
		if((env.registers.Integer[this.reg0R] & 0x01) != 0x01){
			env.memoryInstructionCounter++;
		}
	},
	createBinaryString: function(env){
		return "04" + toHexString8(this.reg0R);
	},
	toString: function(){
		return this.makeUnaryOperandString("CND", "R", this.reg0R);
	},
});

var WebCPU_Instruction_LMEM = function(instrID){
	//メモリ読み込み命令
	WebCPU_Instruction_LMEM.base.apply(this, arguments);
}.extend(WebCPU_Instruction_MEM_Base, {
	instruction: function(env){
		var pointer = env.registers.Pointer[this.reg1P];
		if(this.typ32 == pointer.memoryType){
			var v = env.registers.Pointer[this.reg1P].readData(env);
			env.message("Memory:Read:" + pointer.toString() + ":" + v + "\n", 20);
			if(v !== undefined){
				env.registers.Integer[this.reg0R] = v;
			}
		} else{
			throw new WebCPU_Exception(2, ["Conflict type of pointer."]);
		}
	},
	createBinaryString: function(env){
		return "08" + toHexString8(this.reg0R) + toHexString32(this.typ32) + toHexString8(this.reg1P) + "00";
	},
	toString: function(){
		return this.makeQuaternaryOperandString("LMEM", "R", this.reg0R, "typ:0x", this.typ32, "P", this.reg1P, "reserved:0x", this.reserved);
	},
});

var WebCPU_Instruction_SMEM = function(instrID){
	//メモリ書き込み命令
	WebCPU_Instruction_SMEM.base.apply(this, arguments);
}.extend(WebCPU_Instruction_MEM_Base, {
	instruction: function(env){
		var pointer = env.registers.Pointer[this.reg1P];
		if(this.typ32 == pointer.memoryType){
			var d = env.registers.Integer[this.reg0R];
			if(this.typ32 == 0x03){
				//UINT8
				d &= 0xff;
			} else if(this.typ32 == 0x06){
				//SINT32
				//register native
			} else if(this.typ32 == 0x07){
				//UINT32
				if(d < 0){
					d = (0xffffffff >> 1) + d;
				}
				d &= 0xffffffff;
			} else if(this.typ32 == 0x09){
				//UINT4
				d &= 0xf;
			} else{
				throw new WebCPU_Exception(0, ["Not implemented data type: 0x" + this.typ32.toString(16)]);
			}
			if(d != env.registers.Integer[this.reg0R]){
				env.message("Data lost in type conversion 0x" + env.registers.Integer[this.reg0R].toString(16) + " to:0x" + d.toString(16));
			}
			env.message("Memory:Write:" + pointer.toString() + ":" + d +"\n", 20);
			env.registers.Pointer[this.reg1P].writeData(env, d);
		} else{
			throw new WebCPU_Exception(2, ["Conflict type of pointer."]);
		}
	},
	createBinaryString: function(env){
		return "09" + toHexString8(this.reg0R) + toHexString32(this.typ32) + toHexString8(this.reg1P) + "00";
	},
	toString: function(){
		return this.makeQuaternaryOperandString("SMEM", "R", this.reg0R, "typ:0x", this.typ32, "P", this.reg1P, "reserved:0x", this.reserved);
	},
});

var WebCPU_Instruction_PADD = function(instrID){
	//ポインタ演算命令
	this.reg0P = 0;
	this.typ32 = 0;
	this.reg1P = 0;
	this.reg2R = 0;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 1, 4),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 5, 1),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 6, 1)
		);
		return 8;
	},
	setParameter: function(regPdest, pType, regPsrc, regR){
		this.reg0P = regPdest;
		this.typ32 = pType;
		this.reg1P = regPsrc;
		this.reg2R = regR;
	},
	instruction: function(env){
		if(this.reg0P != this.reg1P){
			env.registers.Pointer[this.reg0P] = env.registers.Pointer[this.reg1P].getCopy();
		}
		env.registers.Pointer[this.reg0P].addressOffset += env.registers.Integer[this.reg2R];
	},
	createBinaryString: function(env){
		return "0E" + toHexString8(this.reg0P) + toHexString32(this.typ32) + toHexString8(this.reg1P) + toHexString8(this.reg2R);
	},
	toString: function(){
		return this.makeQuaternaryOperandString("PADD", "P", this.reg0P, "typ:0x", this.typ32, "P", this.reg1P, "R", this.reg2R);
	},
});

var WebCPU_Instruction_PDIF = function(instrID){
	//ポインタ演算命令
	this.reg0R = 0;
	this.typ32 = 0;
	this.reg1P = 0;
	this.reg2P = 0;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 1, 4),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 5, 1),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 6, 1)
		);
		return 8;
	},
	setParameter: function(regR, pType, reg1P, reg2P){
		this.reg0R = regR;
		this.typ32 = pType;
		this.reg1P = reg1P;
		this.reg2P = reg2P;
	},
	instruction: function(env){
		throw new WebCPU_Exception(0, ["Not implemented:" + this.toString()]);
	},
	createBinaryString: function(env){
		return "0F" + toHexString8(this.reg0R) + toHexString32(this.typ32) + toHexString8(this.reg1P) + toHexString8(this.reg2P);
	},
	toString: function(){
		return this.makeQuaternaryOperandString("PDIF", "R", this.reg0R, "typ:0x", this.typ32, "P", this.reg1P, "P", this.reg2P);
	},
});

var WebCPU_Instruction_PCP = function(instrID){
	//ポインタ代入命令
	//P3Fへの代入でJMP
	this.reg0P = 0;
	this.reg1P = 0;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 1, 1)
		);
		return 3;
	},
	setParameter: function(regPdest, regPsrc){
		this.reg0P = regPdest;
		this.reg1P = regPsrc;
	},
	instruction: function(env){
		if(this.reg0P != this.reg1P){
			env.registers.Pointer[this.reg0P] = env.registers.Pointer[this.reg1P].getCopy();
			if(this.reg0P == 0x3F){
				//P3Fへの代入でJMP
				var type = env.registers.Pointer[0x3F].memoryType;
				if(type == 0x01){
					//VPtr
					env.goToPointerRegister(0x3F);
				} else if(type == 0xC0FFEE){
					//API
					env.API.executeAPI(env);
				} else{
					throw new WebCPU_Exception(2, ["Attempt transfering execution to data section."]);
				}
			}
			
		}
	},
	createBinaryString: function(env){
		return "1E" + toHexString8(this.reg0P) + toHexString8(this.reg1P);
	},
	toString: function(){
		return this.makeBinaryOperandString("PCP", "P", this.reg0P, "P", this.reg1P);
	},
});

var WebCPU_Instruction_MALLOC = function(instrID){
	//メモリ確保命令
	this.reg0P = 0;
	this.reg1R = 0;	//型
	this.reg2R = 0;	//指定された型でのデータの個数
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.reg0P = this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1);
		this.reg1R = this.fetchUnsignedInteger(argBinStr, baseIndex, 1, 1);
		this.reg2R = this.fetchUnsignedInteger(argBinStr, baseIndex, 2, 1);
		return 4;
	},
	instruction: function(env){
		var m = env.mainMemory.allocateMemoryPage(env.registers.Integer[this.reg1R], env.registers.Integer[this.reg2R]);
		env.registers.Pointer[this.reg0P] = new WebCPU_Pointer(m);
	},
	createBinaryString: function(env){
		return "32" + toHexString8(this.reg0P) + toHexString8(this.reg1R) + toHexString8(this.reg2R);
	},
	toString: function(){
		return this.makeTernaryOperandString("MALLOC", "P", this.reg0P, "R", this.reg1R, "R", this.reg2R);
	},
});

var WebCPU_Instruction_DATA = function(instrID){
	//データ記述命令
	this.type = 0;
	this.length = 0;	//指定された型でのデータの個数
	this.byteLength = 0;	//バイト単位でのデータ部分の長さ
	this.dataStr = null;
	this.data = null;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.type = this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 4);
		//指定された型での個数
		this.length = this.fetchUnsignedInteger(argBinStr, baseIndex, 4, 4);
		this.data = new Array();
		if(this.type == 0x03){
			//UINT8
			this.byteLength = this.length;
			this.dataStr = argBinStr.substr(baseIndex + 8 * 2, this.byteLength * 2);
			for(var i = 0; i < this.length; i++){
				this.data.push(parseInt(this.dataStr.substr(i * 2, 2), 16));
			}
		} else if(this.type == 0x06){
			//SINT32
			this.byteLength = this.length * 4;
			this.dataStr = argBinStr.substr(baseIndex + 8 * 2, this.byteLength * 2);
			for(var i = 0; i < this.length; i++){
				this.data.push(parseSignedInt32(this.dataStr.substr(i * 2 * 4, 4), 16));
			}
		} else if(this.type == 0x07){
			//UINT32
			this.byteLength = this.length * 4;
			this.dataStr = argBinStr.substr(baseIndex + 8 * 2, this.byteLength * 2);
			for(var i = 0; i < this.length; i++){
				this.data.push(parseInt(this.dataStr.substr(i * 2 * 4, 4), 16));
			}
		} else if(this.type == 0x09){
			//UINT4
			this.byteLength = Math.ceil(this.length / 2);
			this.dataStr = argBinStr.substr(baseIndex + 8 * 2, this.byteLength * 2);
			for(var i = 0; i < this.length; i++){
				this.data.push(parseInt(this.dataStr.substr(i, 1), 16));
			}
		} else{
			return ("DATA:Not implemented data type: 0x" + this.type.toString(16));
		}
		return 1 + 4 + 4 + this.byteLength;
	},
	instruction: function(env){
		//nothing
	},
	createBinaryString: function(env){
		return "34" + toHexString32(this.type) + toHexString32(this.length) + this.dataStr;
	},
	toString: function(){
		return this.makeBinaryOperandString("DATA", "type:0x", this.type, "length:0x", this.length) + "[" + this.dataStr +"]";
	},
});

var WebCPU_Instruction_REMARK = function(instrID){
	//リマーク命令
	this.remLen = 0;
	this.remStr = null;
}.extend(WebCPU_Instruction, {
	loadArguments: function(argBinStr, baseIndex){
		this.remLen = this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1);
		this.remStr = argBinStr.substr(baseIndex + 1 * 2, this.remLen * 2);
		return 2 + this.remLen;
	},
	instruction: function(env){
		//nothing
	},
	createBinaryString: function(env){
		return "FE" + toHexString8(this.remLen) + this.remStr;
	},
	toString: function(){
		return this.makeUnaryOperandString("REMARK", "len:0x", this.remLen) + "[" + this.remStr +"]";
	},
});
