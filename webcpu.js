//WebCPUは、このディレクトリにあるファイルで完結している。

function WebCPU_Exception(errno, infoArray){
	this.errno = errno;
	this.infoArray = infoArray;
}
WebCPU_Exception.prototype = {
	errorMessageList: [
		"Trap.",
		"Pre-compile error.",
		"Execution error.",
	],
	getMessageString: function(){
		var s = "";
		s += "Error" + this.errno.toString().toUpperCase();
		if(this.errno < 0 || this.errorMessageList.length <= this.errno){
			s += ":Unknown\n";
		} else{
			s += ":" + this.errorMessageList[this.errno] + "\n";
		}
		if(this.infoArray){
			s += "  >" + this.infoArray.toString() + "\n";
		}
		return s;
	},
}
// throw new WebCPU_Exception(2, [""]);

function WebCPU(){
	//APIクラスインスタンス取得
	this.API = new WebCPU_API();

	//DOMオブジェクト連携
	this.debugMessageText = null;
	this.debugIntegerRegisterText = null;
	this.debugPointerRegisterText = null;
	//デバッグコンソール設定
	this.debugMessageBuffer = "";
	var that = this;
	this.messageTimer = null;
	
	//メモリ
	//メモリはラベルごとにページとして区切られ、それらの配列が一つのメモリとなる。
	this.mainMemory = new WebCPU_Memory();
	this.memoryPageCounter = 0;
	this.memoryInstructionCounter = 0;
	this.stopFlag = false;
	
	//レジスタ配列
	this.registers = new Object;
	this.registers.Integer = new Array(64);
	
	//初期化
	this.reset();
	
	//命令リスト
	this.instruction = new Array(0xFF + 1);
	//命令テーブル初期化
	for(var i = 0; i < this.instruction.length; i++){
		this.instruction[i] = WebCPU_Instruction_Undefined;
	}
	//
	this.instruction[0x00] = WebCPU_Instruction_NOP;
	this.instruction[0x01] = WebCPU_Instruction_LB;
	this.instruction[0x02] = WebCPU_Instruction_LIMM;
	this.instruction[0x03] = WebCPU_Instruction_PLIMM;
	this.instruction[0x04] = WebCPU_Instruction_CND;
	this.instruction[0x08] = WebCPU_Instruction_LMEM;
	this.instruction[0x09] = WebCPU_Instruction_SMEM;
	this.instruction[0x0E] = WebCPU_Instruction_PADD;
	this.instruction[0x0F] = WebCPU_Instruction_PDIF;
	//
	this.instruction[0x10] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x11] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x12] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x14] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x15] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x16] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x18] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x19] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x1A] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x1B] = WebCPU_Instruction_TernaryOperation;
	//
	this.instruction[0x1E] = WebCPU_Instruction_PCP;
	//
	this.instruction[0x20] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x21] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x22] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x23] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x24] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x25] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x26] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x27] = WebCPU_Instruction_TernaryOperation;
	//
	this.instruction[0x28] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x29] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x2A] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x2B] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x2C] = WebCPU_Instruction_TernaryOperation;
	this.instruction[0x2D] = WebCPU_Instruction_TernaryOperation;
	//
	this.instruction[0x32] = WebCPU_Instruction_MALLOC;
	this.instruction[0x34] = WebCPU_Instruction_DATA;
	//
	this.instruction[0xFE] = WebCPU_Instruction_REMARK;
	
	this.message("<<< Initialized >>>\n");
}
WebCPU.prototype = {
	loadBinaryText: function(binStr){
		//引数はフロントエンドコードのHex文字列も可能。(Not implemented.)
		//改行やスペースも含まれていてよい。
		//シグネチャも含まれていてよい
		binStr = replaceAll(binStr, " ", "");
		binStr = replaceAll(binStr, "\n", "");
		binStr = replaceAll(binStr, "\r", "");
		binStr = replaceAll(binStr, "\t", "");
		binStr = binStr.toUpperCase();
		if(binStr.substr(0, 4) == "05E1"){
			//シグネチャあり
			this.message("LoadBinaryText:OSECPU signature found.\n", 10);
			if(binStr.substr(4, 2) == "00"){
				//BackEndCode
				this.message("LoadBinaryText:This is BackEndCode.\n", 10);
				binStr = binStr.substr(6);
			} else{
				//FrontEndCode
				this.message("LoadBinaryText:This is FrontEndCode.\n", 10);
				binStr = binStr.substr(4);
				this.loadFrontEndBinaryText(binStr);
				return;
			}
		} else{
			this.message("LoadBinaryText:OSECPU signature NOT found.\n", 1);
		}
		this.loadBackEndBinaryText(binStr);
	},
	loadBackEndBinaryText: function(binStr){
		//引数はバックエンドコードのHex文字列表現でスペースなどの他の文字の混入は認められない。
		this.message("****LoadBackEndBinaryText****\n", 30);
		this.mainMemory.initMemory();
		this.memoryPageCounter = 0;
		this.memoryInstructionCounter = 0;
		
		try{
			for(var i = 0; i < binStr.length; ){
				//命令解釈
				var id = parseInt(binStr.substr(i, 2), 16);
				i += 2;
				var instr = new this.instruction[id](id);
				instr.binOffset = (i >> 1) - 1;
				var instrarglen = instr.loadArguments(binStr, i);
				if(isNaN(parseInt(instrarglen))){
					throw new WebCPU_Exception(1, ["Invalid instrarglen."]);
				}
				//instrarglenをバイト単位から文字列単位に変換し、さらに引数部分のみのサイズに補正する。
				instrarglen = (instrarglen - 1) * 2;
				//命令オペランド長チェック
				if(instrarglen > binStr.length - i){
					//オペランドの長さ分だけのバイナリがなかった、つまり不完全な状態で途切れている
					throw new WebCPU_Exception(1, ["Invalid instrarglen."]);
				}
				i+= instrarglen;
				
				if(id == 0x01){
					//ラベル命令だったのでメモリページを新たにする。
					this.mainMemory.addMemoryPage(new WebCPU_MemoryPage());
					this.memoryPageCounter++;
					this.memoryInstructionCounter = 0;
				}
				
				this.mainMemory.root[this.memoryPageCounter].addMemoryData(instr);
			}
		} catch(e){
			this.message("****LoadBackEndBinaryText Abort:\n", 1);
			if(e instanceof WebCPU_Exception){
				this.message(e.getMessageString(), 1);
			} else{
				throw e;
			}
			this.showDisassembledCode();
			this.mainMemory.initMemory();
			this.memoryPageCounter = 0;
			this.memoryInstructionCounter = 0;
		}
		this.showDisassembledCode();
		this.message("****LoadBackEndBinaryText End****\n", 30);
		
		this.memoryPageCounter = 0;
		this.memoryInstructionCounter = 0;
		this.reset();
	},
	loadFrontEndBinaryText: function(binStr){
		//引数はフロントエンドコードのHex文字列表現でスペースなどの他の文字の混入は認められない。
		this.message("****LoadFrontEndBinaryText****\n", 40);
		this.mainMemory.initMemory();
		this.memoryPageCounter = 0;
		this.memoryInstructionCounter = 0;
		//フロントエンドコードデコーダーの読み込み
		this.loadBinaryText(decoderBinaryString);
		//変換準備
		var backendMaxSize = 65535;
		var temp0MaxSize = 2 * 1024 * 1024;
		var temp1MaxSize = 16 * 1024;
		var temp2MaxSize = 64;
		var temp3MaxSize = 4 * 1024 + 1;
		var temp4MaxSize = 256;
		var m;
		//P02 = T_UINT8:  &backend[2] （出力バッファ先頭）
		m = this.mainMemory.allocateMemoryPage(WebCPU.pType.UINT8, backendMaxSize);
		this.registers.Pointer[0x02] = new WebCPU_Pointer(m);
		//P03 = T_UINT8:  &backend[backend-maxsize] （出力バッファの限界）
		this.registers.Pointer[0x03] = this.registers.Pointer[0x02].getCopy();
		this.registers.Pointer[0x03].addressOffset = backendMaxSize;
		//P04 = T_UINT8:  &frontend[2] （入力データ先頭）
		m = this.mainMemory.allocateMemoryPage(WebCPU.pType.UINT8);
		this.registers.Pointer[0x04] = new WebCPU_Pointer(m);
		this.registers.Pointer[0x04].addressOffset = 0;
		this.registers.Pointer[0x04].memoryPage.data[1].data = new Array();
		var a = this.registers.Pointer[0x04].memoryPage.data[1].data;
		var i;
		for(i = 0; i * 2 < binStr.length; i++){
			a.push(parseInt(binStr.substr(i * 2, 2), 16));
		}
		//P05 = T_UINT8:  &frontend[frontend-size] （入力データの終端：最終バイトの次のアドレス）
		this.registers.Pointer[0x05] = this.registers.Pointer[0x04].getCopy();
		this.registers.Pointer[0x05].addressOffset = i;
		//P06 = T_UINT8:  &temp0[0] （要素数が2M以上のテンポラリバッファ）
		m = this.mainMemory.allocateMemoryPage(WebCPU.pType.UINT8, temp0MaxSize);
		this.registers.Pointer[0x06] = new WebCPU_Pointer(m);
		//P07 = T_UINT8:  &temp0[temp-maxsize]
		this.registers.Pointer[0x07] = this.registers.Pointer[0x06].getCopy();
		this.registers.Pointer[0x07].addressOffset = temp0MaxSize;
		//P0A = T_UINT32: &temp1[0] （要素数が16Kくらいあれば十分なバッファ）
		m = this.mainMemory.allocateMemoryPage(WebCPU.pType.UINT32, temp1MaxSize);
		this.registers.Pointer[0x0A] = new WebCPU_Pointer(m);
		//P0B = T_SINT32: &temp2[0] （要素数が64のバッファ：Pxxレジスタの個数）
		m = this.mainMemory.allocateMemoryPage(WebCPU.pType.SINT32, temp2MaxSize);
		this.registers.Pointer[0x0B] = new WebCPU_Pointer(m);
		//P0C = T_SINT32: &temp3[0] （要素数が4Kのバッファ：登録可能ラベル数）
		m = this.mainMemory.allocateMemoryPage(WebCPU.pType.SINT32, temp3MaxSize);
		this.registers.Pointer[0x0C] = new WebCPU_Pointer(m);
		//P0D = T_UINT8:  &temp4[0] （要素数が256のバッファ）
		m = this.mainMemory.allocateMemoryPage(WebCPU.pType.UINT8, temp4MaxSize);
		this.registers.Pointer[0x0D] = new WebCPU_Pointer(m);
		//変換
		this.execute();
		/*
		P02 == バックエンドコードの終端, つまり P02 - &backend[0] = バックエンドコードのサイズ
		*/
		if(this.registers.Integer[0x00] == 0){
			//R00 == 0 正常終了
			var binData = this.registers.Pointer[0x02].memoryPage.data[1];
			var binStr = "";
			for(var i = 0; i < this.registers.Pointer[0x02].addressOffset; i++){
				binStr += ("00" + binData.data[i].toString(16)).slice(-2);
			}
			this.message("[" + binStr + "](" + (binStr.length >> 1) + "Bytes)\n");
			this.loadBackEndBinaryText(binStr);
			this.reset();
		} else{
			//R00 != 0 変換失敗
			this.message("loadFrontEndBinaryText: Translate failed.\n");
		}
		
		this.message("****LoadFrontEndBinaryText End****\n", 40);
	},
	executeStepIn: function(){
		//ステップ実行する。
		//一回実行するたびに再描画する。
		var retv = this.executeStepIn_Internal(true);
		this.API.API_flushWin(this, this.API.mainWindowCanvas.width, this.API.mainWindowCanvas.height, 0, 0);
		return retv;
	},
	executeStepIn_Internal: function(isManualStepIn){
		//ステップ実行の内部部分。
		//終端到達時は1を、まだ後続命令がある場合は0を返す。
		//終了時にのみ再描画を行う
		if(this.stopFlag){
			this.message(">stepIn:Break.\n", 2);
			this.stopFlag = false;
			this.API.API_flushWin(this, this.API.mainWindowCanvas.width, this.API.mainWindowCanvas.height, 0, 0);
			return 2;
		}
		var instr = this.fetchMemoryNext();
		if(instr === undefined){
			this.message(">stepIn:control reached end of binary.\n", 2);
			this.API.API_flushWin(this, this.API.mainWindowCanvas.width, this.API.mainWindowCanvas.height, 0, 0);
			return 1;
		}
		if(isManualStepIn){
			this.message(">stepIn:" + this.memoryPageCounter + "-" + (this.memoryInstructionCounter - 1) + ":" + instr.toString() + "\n", 20);
		}
		instr.execute(this);
		//これ以降this.memoryInstructionCounterが今実行した命令を指すとは限らない。（JMP系命令のため）
		/*
		//ブレークポイント
		if(this.memoryPageCounter == 233 && this.memoryInstructionCounter == 0){
			this.message(">stepIn:Breakpoint.\n", 2);
			return 3;
		}
		*/
		return 0;
	},
	execute: function(){
		//最速で実行する
		for(;;){
			if(this.executeStepIn_Internal(false) != 0){
				return;
			}
		}
	},
	reset: function(){
		//実行環境をリセットする。メモリ内容は保持される。
		for(var i = 0; i < this.registers.Integer.length; i++){
			this.registers.Integer[i] = 0;
		}
		this.registers.Pointer = new Array(64);
		for(var i = 0; i < this.registers.Pointer.length; i++){
			this.registers.Pointer[i] = new WebCPU_Pointer(null);
		}
		//Set P28 for API  calling.
		this.registers.Pointer[0x28].memoryType = 0xC0FFEE;
		//
		this.memoryPageCounter = 0;
		this.memoryInstructionCounter = 0;
		this.stopFlag = false;
		//reset window
		if(this.API.mainWindowCanvas){
			this.API.setMainWindowCanvasDOMObject(this.API.mainWindowCanvas);
		}
		this.message("<<< Reset >>>\n");
	},
	fetchMemoryNext: function(){
		if(this.mainMemory.root[this.memoryPageCounter].data.length <= this.memoryInstructionCounter){
			this.memoryPageCounter++;
			if(this.mainMemory.root.length <= this.memoryPageCounter){
				this.memoryPageCounter--;
				return undefined;
			}
			this.memoryInstructionCounter -= this.mainMemory.root[this.memoryPageCounter - 1].data.length;
		}
		var retv = this.mainMemory.root[this.memoryPageCounter].data[this.memoryInstructionCounter];
		this.memoryInstructionCounter++;
		return retv;
	},
	setMainWindowCanvasDOMObject: function(id){
		this.API.setMainWindowCanvasDOMObject(document.getElementById(id));
	},
	setDebugMessageDOMObject: function(name){
		if(name){
			this.debugMessageText = document.getElementsByName(name)[0];
			if(!this.debugMessageText){
				this.debugMessageText = document.getElementById(name);
			}
		} else{
			this.debugMessageText = null;
		}
		this.setDebugTimer();
	},
	setDebugIntegerRegisterDOMObject: function(name){
		if(name){
			this.debugIntegerRegisterText = document.getElementsByName(name)[0];
			if(!this.debugIntegerRegisterText){
				this.debugIntegerRegisterText = document.getElementById(name);
			}
		} else{
			this.debugIntegerRegisterText = null;
		}
		this.setDebugTimer();
	},
	setDebugPointerRegisterDOMObject: function(name){
		this.debugPointerRegisterText = document.getElementsByName(name)[0];
		if(name){
			this.debugPointerRegisterText = document.getElementsByName(name)[0];
			if(!this.debugPointerRegisterText){
				this.debugPointerRegisterText = document.getElementById(name);
			}
		} else{
			this.debugPointerRegisterText = null;
		}
		this.setDebugTimer();
	},
	setDebugTimer: function(){
		if(!this.debugMessageText && !this.debugIntegerRegisterText && !this.debugPointerRegisterText){
			//すべて無効だったらタイマーの動作自体を止める
			window.clearTimeout(this.messageTimer);
			this.messageTimer = null;
			WebCPU_Instruction.prototype.isEnabledPrintSourceRegister = false;
			WebCPU_Instruction.prototype.isEnabledPrintDestinationRegister = false;
		} else if(!this.messageTimer){
			//どれかが有効でかつタイマーが止まっていたらスタートさせる
			var that = this;
			this.messageTimer = window.setInterval(function(){that.debugShowTick();}, 50);
			WebCPU_Instruction.prototype.isEnabledPrintSourceRegister = true;
			WebCPU_Instruction.prototype.isEnabledPrintDestinationRegister = true;
		}
	},
	debugShowTick: function(){
		if(this.debugMessageText && this.debugMessageBuffer != ""){
			var str = this.debugMessageText.value + this.debugMessageBuffer;
			this.debugMessageBuffer = "";
			if(str.length > WebCPU.maxDebugStringLength){
				str = str.slice(str.length - (WebCPU.maxDebugStringLength >> 1));
			}
			this.debugMessageText.value = str;
			this.debugMessageText.scrollTop = this.debugMessageText.scrollHeight;
		}
		this.refreshDebugIntegerRegisterText();
		this.refreshDebugPointerRegisterText();
	},
	message: function(str, id){
		//id:メッセージの種類
		//省略:常に表示する
		//1:Error
		//2:Warning
		//10:バイナリ読み込みデバッグ
		//20:実行時詳細情報
		//30:バックエンドバイナリ読み込みデバッグ
		//40:フロントエンドバイナリ読み込みデバッグ
		if(this.debugMessageText != null){
			if(
				true ||
				id == 1 || 
				id == 2 || 
				id == 30
			){
				this.debugMessageBuffer += str;
			}
		} else if(id == 1){
			//エラーのときmessageが無効であればalertで表示する。
			window.alert(str);
		}
	},
	showDisassembledCode: function(){
		for(var i = 0; i < this.mainMemory.root.length; i++){
			for(var j = 0; j < this.mainMemory.root[i].data.length; j++){
				var instr = this.mainMemory.root[i].data[j];
				this.message("+0x" + instr.binOffset.toString(16).toUpperCase() + ":" + i + "-" + j + ":" + instr.toString() + "\n", 30);
			}
			this.message(" - - - - \n", 30);
		}
	},
	refreshDebugIntegerRegisterText: function(){
		if(this.debugIntegerRegisterText != null){
			this.debugIntegerRegisterText.value = "";
			for(var i = 0; i < this.registers.Integer.length; i++){
				this.debugIntegerRegisterText.value += "R" +  ("00" + i.toString(16)).slice(-2).toUpperCase() + ":0x" + this.registers.Integer[i].toString(16).toUpperCase() + "\n";
			}
		}
	},
	refreshDebugPointerRegisterText: function(){
		if(this.debugPointerRegisterText != null){
			this.debugPointerRegisterText.value = "";
			for(var i = 0; i < this.registers.Pointer.length; i++){
				if(this.registers.Pointer[i]){
					this.debugPointerRegisterText.value += "P" +  ("00" + i.toString(16)).slice(-2).toUpperCase() + ":" + this.registers.Pointer[i].toString() + "\n";
				} else{
					this.debugPointerRegisterText.value += "P" +  ("00" + i.toString(16)).slice(-2).toUpperCase() + ":(null)\n";
				}
			}
		}
	},
	goToPointerRegister: function(reg0P){
		//レジスタはいじらない
		//goto
		var p = this.registers.Pointer[reg0P];
		if(p.memoryType == 1){
			//VPtr
			this.memoryPageCounter = this.mainMemory.getMemoryPageCountFromMemoryPageInstance(p.memoryPage);
			if(this.memoryPageCounter !== undefined){
				this.memoryInstructionCounter = 0;
				this.message("JMP:page " + this.memoryPageCounter + "\n", 20);
			} else{
				throw new WebCPU_Exception(2, ["memoryPage not found in mainMemory."]);
			}
		} else{
			throw new WebCPU_Exception(2, ["Can't goto Memory page type is not VPtr."]);
		}
	},
	createBackendBinaryString: function(){
		var s = "05E100";
		var instr;
		
		this.reset();
		for(;;){
			instr = this.fetchMemoryNext();
			if(instr === undefined){
				break;
			}
			s += instr.createBinaryString(this);
		}
		return s;
	},
	staticOptimize: function(){
		//静的最適化
		this.staticOptimize_RemoveDuplicatedLabelNumber();
		this.staticOptimize_CMPxx_CND_PLIMM_PLIMM_LB();
		this.staticOptimize_RemoveUnusedLabelNumber();
	},
	staticOptimize_RemoveDuplicatedLabelNumber: function(){
		//連続するラベル命令の削除
		//一つのメモリページにラベル命令のみがある場合は、それを次のメモリページのラベル名に置換する
		var mpage;
		var removePageIndexStack = new Array();
		var labelIDStack = new Array();
		var labelID;
		var newLabelID;
		for(var i = 0; i < this.mainMemory.root.length; i++){
			mpage = this.mainMemory.root[i];
			if(mpage instanceof WebCPU_MemoryPage && mpage.data[0] instanceof WebCPU_Instruction_LB){
				//メモリページ
				if(mpage.data.length == 1){
					//ラベルしかないので削除候補に追加
					labelIDStack.push(mpage.data[0].imm32);
					removePageIndexStack.push(i);
				} else{
					//これは必要なラベル命令
					if(labelIDStack.length != 0){
						for(;;){
							labelID = labelIDStack.pop();
							if(labelID == undefined){
								break;
							}
							this.mainMemory.root.splice(removePageIndexStack[0], 1);
							i--;
							this.staticOptimize_ReplaceLabelNumber(labelID, mpage.data[0].imm32);
						}
						removePageIndexStack = new Array();
					}
				}
			}
		}
		if(labelIDStack.length != 0){
			//プログラム末尾のラベル命令は削除しない。
			newLabelID = labelIDStack.pop();
			for(;;){
				labelID = labelIDStack.pop();
				if(labelID == undefined){
					break;
				}
				this.mainMemory.root.splice(removePageIndexStack[0], 1);
				i--;
				this.staticOptimize_ReplaceLabelNumber(labelID, newLabelID);
			}
		}
	},
	staticOptimize_ReplaceLabelNumber: function(from, to){
		//PLIMM命令のラベル番号がfromのものをtoに変更する。
		var mpage;
		var instr;
		for(var i = 0, iLen = this.mainMemory.root.length; i < iLen; i++){
			mpage = this.mainMemory.root[i];
			for(var j = 0, jLen = mpage.data.length; j < jLen; j++){
				instr = mpage.data[j];
				if(instr instanceof WebCPU_Instruction_PLIMM){
					if(instr.imm32 == from){
						instr.imm32 = to;
					}
				}
			}
		}
	},
	staticOptimize_RemoveUnusedLabelNumber: function(){
		var usedLabelNumberList = new Array();
		var mpage;
		var instr;
		//使われているラベル番号のリスト生成
		for(var i = 0, iLen = this.mainMemory.root.length; i < iLen; i++){
			mpage = this.mainMemory.root[i];
			for(var j = 0, jLen = mpage.data.length; j < jLen; j++){
				instr = mpage.data[j];
				if(instr instanceof WebCPU_Instruction_PLIMM){
					usedLabelNumberList.pushUnique(instr.imm32);
				}
			}
		}
		//ラベルを走査し、不要なラベル番号を削除
		for(var i = 0; i < this.mainMemory.root.length; i++){
			mpage = this.mainMemory.root[i];
			if(mpage instanceof WebCPU_MemoryPage && mpage.data[0] instanceof WebCPU_Instruction_LB){
				if(mpage.data[0].opt == 1 || usedLabelNumberList.isIncluded(mpage.data[0].imm32)){
					//使われている、もしくはグローバルなラベル番号
				} else{
					//未参照のローカルラベル番号
					//ひとまずラベル命令削除
					mpage.data.splice(0, 1);
					if(i != 0){
						//一つ前のページに統合
						this.mainMemory.root[i - 1].data = this.mainMemory.root[i - 1].data.concat(mpage.data);
						//このページを削除
						this.mainMemory.root.splice(i, 1);
						i--;
					}
				}
			}
		}
	},
	staticOptimize_CMPxx_CND_PLIMM_PLIMM_LB: function(){
		//From:
		//>CMPxx(Ra, --, --);
		//CND(Ra);
		//>PLIMM(P3F, b);
		//PLIMM(P3F, --);
		//----
		//LB(opt:--, b);
		//
		//To:
		//>CMP!(xx)(Ra, --, --);
		//CND(Ra);
		//PLIMM(P3F, --);
		//----
		//LB(opt:--, b);
		
		//これより後にstaticOptimize_RemoveUnusedLabelNumberを実行することを推奨する。
		//CMP系命令は、InstrIDが偶数の場合+1, 奇数の場合-1することで逆の条件になる。
		//CMP系:20-2D
		var mode = 0;
		var rega;
		var immb;
		//0:次は CMPxx(Ra, --, --);
		//1:次は CND(Ra);
		//2:次は PLIMM(P3F, b);
		//3:次は PLIMM(P3F, --);
		//4:次は LB(opt:--, b);
		for(var i = 0, iLen = this.mainMemory.root.length; i < iLen; i++){
			mpage = this.mainMemory.root[i];
			for(var j = 0, jLen = mpage.data.length; j < jLen; j++){
				instr = mpage.data[j];
				switch(mode){
					case 0:
						if(instr instanceof WebCPU_Instruction_TernaryOperation && 0x20 <= instr.instrID && instr.instrID <= 0x2D){
							//CMPxx(Ra, --, --);
							rega = instr.reg0;
							mode++;
						}
						break;
					case 1:
						if(instr instanceof WebCPU_Instruction_CND && instr.reg0R == rega){
							//CND(Ra);
							mode++;
						} else{
							mode = 0;
						}
						break;
					case 2:
						if(instr instanceof WebCPU_Instruction_PLIMM && instr.reg0 == 0x3f){
							//PLIMM(P3F, b);
							immb = instr.imm32;
							mode++;
						} else{
							mode = 0;
						}
						break;
					case 3:
						if(instr instanceof WebCPU_Instruction_PLIMM && instr.reg0 == 0x3f){
							//PLIMM(P3F, --);
							mode++;
						} else{
							mode = 0;
						}
						break;
					case 4:
						if(instr instanceof WebCPU_Instruction_LB && instr.imm32 == immb){
							//LB(opt:--, b);
							//置換対象確定
							mpage = this.mainMemory.root[i - 1];
							//CMPxx(Ra, --, --); -> CMP!(xx)(Ra, --, --);
							instr = mpage.data[mpage.data.length - 4];
							if((instr.instrID & 0x01) == 0){
								instr.instrID++;
							} else{
								instr.instrID--;
							}
							instr.setParameter(instr.reg0, instr.reg1, instr.reg2);
							//Remove PLIMM(P3F, b);
							mpage.data.splice(mpage.data.length - 2, 1);
						}
						mode = 0;
						break;
				}
			}
		}
	},
}

//数値計算
function parseSignedInt32(hexStr){
	//文字列を16進32bit符号あり整数として変換する。
	var i = parseInt(hexStr, 16);
	if(i > 0x7fffffff){
		//-
		return -(~i + 1);
	}
	//+
	return i;
}

function parseSignedInt(hexStr, bits){
	//文字列を16進符号あり整数として変換する。
	//32bitまで対応
	var i = parseInt(hexStr, 16);
	if(i >= (1 << (bits - 1))){
		//-
		return -(((0xffffffff >>> (32 - bits)) - i) + 1);
	}
	//+
	return i;
}

function toHexString8(v){
	return ("00" + v.toString(16).toUpperCase()).slice(-2);
}

function toHexString32(v){
	if(v < 0){
		v = 0x100000000 + v;
	}
	return ("00000000" + v.toString(16).toUpperCase()).slice(-8);
}

function replaceAll(str, org, dest){
	//文字列str中にある文字列orgを文字列destにすべて置換する。
	//http://www.syboos.jp/webjs/doc/string-replace-and-replaceall.html
	return str.split(org).join(dest);
}
