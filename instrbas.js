//
// Instruction baseclass
//

function WebCPU_Instruction(instrID){
	//命令クラス共通部分
	//バックエンドバイナリでの命令先頭バイトのオフセット
	this.binOffset = 0;
}
WebCPU_Instruction.prototype = {
	// loadArguments, execute, toStringが必須。
	loadArguments: function(argBinStr, baseIndex){
		//戻り値は、読み込み成功時はその命令の占めるバイト数、失敗時はエラー文字列を返す。
		//常に読み込みエラー
		return this.toString();
	},
	setParameter: function(){
	
	},
	execute: function(env){
		//printXXXはデバッグ用
		if(this.isEnabledPrintSourceRegister && this.printSourceRegister){
			this.printSourceRegister(env);
		}
		this.instruction(env);
		if(this.isEnabledPrintDestinationRegister && this.printDestinationRegister){
			this.printDestinationRegister(env);
		}
	},
	instruction: function(env){
		//envはCPUのインスタンス
		throw new WebCPU_Exception(0, ["Not implemented:" + this.toString()]);
	},
	createBinaryString: function(env){
		//envはCPUのインスタンス
		throw new WebCPU_Exception(0, ["Not implemented:" + this.toString()]);
	},
	toString: function(){
		return "Undefined()[0x" + this.instrID.toString(16).toUpperCase() + "];";
	},
	//
	makeUnaryOperandString: function(mnemonic, typestr0, arg0){
		return mnemonic + "(" + typestr0 + arg0.toString(16).toUpperCase() + ");";
	},
	makeBinaryOperandString: function(mnemonic, typestr0, arg0, typestr1, arg1){
		return mnemonic + "(" + typestr0 + arg0.toString(16).toUpperCase() + ", " + typestr1 + arg1.toString(16).toUpperCase() + ");";
	},
	makeTernaryOperandString: function(mnemonic, typestr0, arg0, typestr1, arg1, typestr2, arg2){
		return mnemonic + "(" + typestr0 + arg0.toString(16).toUpperCase() + ", " + typestr1 + arg1.toString(16).toUpperCase() + ", " + typestr2 + arg2.toString(16).toUpperCase() + ");";
	},
	makeQuaternaryOperandString: function(mnemonic, typestr0, arg0, typestr1, arg1, typestr2, arg2, typestr3, arg3){
		return mnemonic + "(" + typestr0 + arg0.toString(16).toUpperCase() + ", " + typestr1 + arg1.toString(16).toUpperCase() + ", " + typestr2 + arg2.toString(16).toUpperCase() + ", " + typestr3 + arg3.toString(16).toUpperCase() + ");";
	},
	//
	makeRRegString: function(env, reg){
		return "R" + reg.toString(16).toUpperCase() + ":0x" +  env.registers.Integer[reg].toString(16).toUpperCase();
	},
	makePRegString: function(env, reg){
		return "P" + reg.toString(16).toUpperCase() + ":0x" + env.registers.Pointer[reg].addressOffset.toString(16).toUpperCase();
	},
	printRReg: function(env, reg){
		env.message(this.makeRRegString(env, reg) + "\n");
	},
	printPReg: function(env, reg){
		env.message(this.makePRegString(env, reg) + "\n");
	},
	//
	fetchUnsignedInteger: function(argBinStr, baseIndex, offset, bytes){
		return parseInt(argBinStr.substr(baseIndex + offset * 2, bytes * 2), 16);
	},
	fetchSignedInteger: function(argBinStr, baseIndex, offset, bytes){
		return parseSignedInt32(argBinStr.substr(baseIndex + offset * 2, bytes * 2), 16);
	},
	//
	isEnabledPrintSourceRegister: true,
	isEnabledPrintDestinationRegister: true,
	printSourceRegister: null,
	printDestinationRegister: null,
}

var WebCPU_Instruction_MEM_Base = function(instrID){
	//メモリ関連命令共通部分
	this.reg0R = 0;
	this.typ32 = 0;
	this.reg1P = 0;
	this.reserved = 0;
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
	setParameter: function(regR, pType, regP, reserved){
		this.reg0R = regR;
		this.typ32 = pType;
		this.reg1P = regP;
		this.reserved = reserved;
	},
});

var WebCPU_Instruction_TernaryOperation = function(instrID){
	//単純代入命令
	//三項演算命令
	//整数比較命令
	//演算結果はすべて符号ありであることに注意
	this.instrID = instrID;
	this.reg0 = 0;
	this.reg1 = 0;
	this.reg2 = 0;
	this.subfunc = null;
}.extend(WebCPU_Instruction, {
	mnemonicList1: [
		"OR",
		"XOR",
		"AND",
		"UD",
		"ADD",
		"SUB",
		"MUL",
		"UD",
		"SHL",
		"SAR",
		"DIV",
		"MOD",
	],
	mnemonicList2: [
		"CMPE",
		"CMPNE",
		"CMPL",
		"CMPGE",
		"CMPLE",
		"CMPG",
		"TSTZ",
		"TSTNZ",
	],
	loadArguments: function(argBinStr, baseIndex){
		this.setParameter(
			this.fetchUnsignedInteger(argBinStr, baseIndex, 0, 1),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 1, 1),
			this.fetchUnsignedInteger(argBinStr, baseIndex, 2, 1)
		);
		if(this.instruction == WebCPU_Instruction_TernaryOperation.base.prototype.instruction){
			return 1;
		}
		return 4;
	},
	setParameter: function(destReg, srcReg0, srcReg1){
		if(this.instrID === undefined){
			throw "setParameter:instrID undefined";
		}
		this.reg0 = destReg;
		this.reg1 = srcReg0;
		this.reg2 = srcReg1;
		if(this.instrID == 0x10){
			if(srcReg1 == 0xFF){
				//CP
				this.mnemonic = "CP";
				this.instruction = this.instrCP;
				this.printSourceRegister = this.printSourceRegisterCP;
			} else{
				//OR
				this.mnemonic = this.mnemonicList1[0];
				this.instruction = this.instrOR;
			}
		} else if(0x11 <= this.instrID && this.instrID <= 0x1B){
			// list1
			this.mnemonic = this.mnemonicList1[this.instrID - 0x10];
			this.instruction = eval("this.instr" + this.mnemonic);
		} else if(0x20 <= this.instrID && this.instrID <= 0x27){
			//list2
			this.mnemonic = this.mnemonicList2[this.instrID - 0x20];
			this.instruction = eval("this.instr" + this.mnemonic);
		} else if(0x28 <= this.instrID && this.instrID <= 0x2D){
			//list2P
			this.mnemonic = "P" + this.mnemonicList2[this.instrID - 0x28];
			this.instruction = this.instrP;
			this.subfunc = eval("this.instr" + this.mnemonic);
			this.printSourceRegister = this.printSourceRegisterP;
		}
	},
	//
	instrCP: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1];
	},
	instrOR: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] | env.registers.Integer[this.reg2];
	},
	instrXOR: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] ^ env.registers.Integer[this.reg2];
	},
	instrAND: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] & env.registers.Integer[this.reg2];
	},
	instrADD: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] + env.registers.Integer[this.reg2];
	},
	instrSUB: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] - env.registers.Integer[this.reg2];
	},
	instrMUL: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] * env.registers.Integer[this.reg2];
	},
	instrSHL: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] << env.registers.Integer[this.reg2];
	},
	instrSAR: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] >> env.registers.Integer[this.reg2];
	},
	instrDIV: function(env){
		env.registers.Integer[this.reg0] = parseInt(env.registers.Integer[this.reg1] / env.registers.Integer[this.reg2]);
	},
	instrMOD: function(env){
		env.registers.Integer[this.reg0] = env.registers.Integer[this.reg1] % env.registers.Integer[this.reg2];
	},
	//
	instrCMPE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Integer[this.reg1] == env.registers.Integer[this.reg2]) ? -1 : 0;
	},
	instrCMPNE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Integer[this.reg1] != env.registers.Integer[this.reg2]) ? -1 : 0;
	},
	instrCMPL: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Integer[this.reg1] < env.registers.Integer[this.reg2]) ? -1 : 0;
	},
	instrCMPGE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Integer[this.reg1] >= env.registers.Integer[this.reg2]) ? -1 : 0;
	},
	instrCMPLE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Integer[this.reg1] <= env.registers.Integer[this.reg2]) ? -1 : 0;
	},
	instrCMPG: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Integer[this.reg1] > env.registers.Integer[this.reg2]) ? -1 : 0;
	},
	instrTSTZ: function(env){
		env.registers.Integer[this.reg0] = ((env.registers.Integer[this.reg1] & env.registers.Integer[this.reg2]) == 0) ? -1 : 0;
	},
	instrTSTNZ: function(env){
		env.registers.Integer[this.reg0] = ((env.registers.Integer[this.reg1] & env.registers.Integer[this.reg2]) != 0) ? -1 : 0;
	},
	//
	instrP: function(env){
		if(env.registers.Pointer[this.reg1].verifySameMemoryPageAs(env.registers.Pointer[this.reg2])){
			this.subfunc(env);
		} else{
			throw new WebCPU_Exception(2, ["Attempt to compare pointers in different memoyPage."]);
		}
	},
	//
	instrPCMPE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Pointer[this.reg1].addressOffset == env.registers.Pointer[this.reg2].addressOffset) ? -1 : 0;
	},
	instrPCMPNE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Pointer[this.reg1].addressOffset != env.registers.Pointer[this.reg2].addressOffset) ? -1 : 0;
	},
	instrPCMPL: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Pointer[this.reg1].addressOffset < env.registers.Pointer[this.reg2].addressOffset) ? -1 : 0;
	},
	instrPCMPGE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Pointer[this.reg1].addressOffset >= env.registers.Pointer[this.reg2].addressOffset) ? -1 : 0;
	},
	instrPCMPLE: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Pointer[this.reg1].addressOffset <= env.registers.Pointer[this.reg2].addressOffset) ? -1 : 0;
	},
	instrPCMPG: function(env){
		env.registers.Integer[this.reg0] = (env.registers.Pointer[this.reg1].addressOffset > env.registers.Pointer[this.reg2].addressOffset) ? -1 : 0;
	},
	//
	createBinaryString: function(env){
		return toHexString8(this.instrID) + toHexString8(this.reg0) + toHexString8(this.reg1) + toHexString8(this.reg2);
	},
	toString: function(){
		if(this.mnemonic == "CP"){
			return this.makeBinaryOperandString("CP", "R", this.reg0, "R", this.reg1);
		}
		if(this.mnemonic == "UD"){
			return "Undefined();";
		}
		if(0x28 <= this.instrID && this.instrID <= 0x2D){
			return this.makeTernaryOperandString(this.mnemonic, "R", this.reg0, "P", this.reg1, "P", this.reg2);
		}
		return this.makeTernaryOperandString(this.mnemonic, "R", this.reg0, "R", this.reg1, "R", this.reg2);
	},
	//
	printSourceRegister: function(env){
		this.printRReg(env, this.reg1);
		this.printRReg(env, this.reg2);
	},
	printSourceRegisterP: function(env){
		this.printPReg(env, this.reg1);
		this.printPReg(env, this.reg2);
	},
	printSourceRegisterCP: function(env){
		this.printPReg(env, this.reg1);
	},
	printDestinationRegister: function(env){
		this.printRReg(env, this.reg0);
	},
});
