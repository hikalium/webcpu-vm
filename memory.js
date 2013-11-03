function WebCPU_Memory(){
	this.initMemory();
}
WebCPU_Memory.prototype = {
	addMemoryPage: function(memoryPage){
		this.root.push(memoryPage);
	},
	initMemory: function(){
		this.root = new Array();
		this.addMemoryPage(new WebCPU_MemoryPage());
	},
	getMemoryPageCountFromMemoryPageInstance: function(memoryPage){
		for(var i = 0; i < this.root.length; i++){
			if(this.root[i] == memoryPage){
				return i;
			}
		}

		return undefined;
	},
	getMemoryPageInstanceFromLabelNumber: function(labelnum){
		//ラベルをメモリから探し出す
		for(var i = 0; i < this.root.length; i++){
			if(this.root[i].data[0] instanceof WebCPU_Instruction_LB){
				if(this.root[i].data[0].imm32 == labelnum){
					return this.root[i];
				}
			}
		}
		return undefined;
	},
	allocateMemoryPage: function(type, length){
		//指定された型と長さのメモリを確保して返す。
		length = length ? length : 0;
		var m = new WebCPU_MemoryPage();
		m.addMemoryData(new WebCPU_Instruction_LB());
		m.addMemoryData(new WebCPU_Instruction_DATA());
		m.data[1].type = type;
		m.data[1].data = new Array(length);
		return m;
	},
}

function WebCPU_MemoryPage(size){
	size = size ? size : 0;
	this.data = new Array(size);
}
WebCPU_MemoryPage.prototype = {
	addMemoryData: function(memoryData){
		this.data.push(memoryData);
	},
}

function WebCPU_Pointer(memoryPage){
	this.memoryPage = memoryPage;
	this.memoryType = 0;
	this.addressOffset = 0;
	this.labelNumber = null;
	//ポインタタイプ判別
	if(this.memoryPage && this.memoryPage.data && this.memoryPage.data.length > 0){
		if(this.memoryPage.data[0] instanceof WebCPU_Instruction_LB){
			//ラベルが直下にあればそのラベル番号をポインタに記憶する
			this.labelNumber = this.memoryPage.data[0].imm32;
			this.memoryType = this.T_VPtr;
			if(this.memoryPage.data[1]){
				if(this.memoryPage.data[1] instanceof WebCPU_Instruction_DATA){
					//ラベル直下がDATAだった場合はそのDATAの型に従う
					var type = this.memoryPage.data[1].type;
					if(1 <= type && type < this.memoryTypeStrList.length){
						this.memoryType = type;
					} else{
						console.log("unknown data type.");
					}
				}
			}
		}
	}
	this.memoryTypeStr = this.memoryTypeStrList[this.memoryType];
}

WebCPU_Pointer.prototype = {
	memoryTypeStrList: [
		"Undefined",
		"VPtr",		// コードポインタ？
		"SINT8",	// 8bitの符号付き, いわゆる signed char.
		"UINT8",
		"SINT16",	// 16bitの符号付き, いわゆる short.
		"UINT16",
		"SINT32",
		"UINT32",
		"SINT4",
		"UINT4",
		"SINT2",
		"UINT2",
		"SINT1",	// 代入できるのは0か-1のみ.
		"UINT1",
		"SINT12",
		"UINT12",
		"SINT20",
		"UINT20",
		"SINT24",
		"UINT24",
		"SINT28",
		"UINT28",	//0x15
	],
	T_VPtr		:0x01,
	T_SINT8		:0x02,	//8bitの符号付き, いわゆる signed char.
	T_UINT8		:0x03,
	T_SINT16	:0x04,	//16bitの符号付き, いわゆる short.
	T_UINT16	:0x05,
	T_SINT32	:0x06,
	T_UINT32	:0x07,
	T_SINT4		:0x08,
	T_UINT4		:0x09,
	T_SINT2		:0x0a,
	T_UINT2		:0x0b,
	T_SINT1		:0x0c,	//代入できるのは0か-1のみ.
	T_UINT1		:0x0d,
	T_SINT12	:0x0e,
	T_UINT12	:0x0f,
	T_SINT20	:0x10,
	T_UINT20	:0x11,
	T_SINT24	:0x12,
	T_UINT24	:0x13,
	T_SINT28	:0x14,
	T_UINT28	:0x15,
	toString: function(){
		if(this.memoryType == 0xC0FFEE){
			//API Address, NOT OFFICIAL
			return "#API";
		}
		if(this.labelNumber == null){
			if(this.memoryPage && this.memoryPage.data && this.memoryPage.data[1].data){
				return this.memoryTypeStrList[this.memoryType] + ":" + this.addressOffset + " / " + this.memoryPage.data[1].data.length;
			}
			return this.memoryTypeStrList[this.memoryType] + ":" + this.addressOffset;
		}
		return "Label#0x" + this.labelNumber.toString(16).toUpperCase() + ":" + this.addressOffset + ":" + this.memoryTypeStr;
	},
	readData: function(env){
		if(this.memoryPage.data[1].data.length <= this.addressOffset){
			throw new WebCPU_Exception(2, ["Attempt to access to out of pointer range."]);
		}
		var data = this.memoryPage.data[1].data[this.addressOffset];
		if(data === undefined){
			throw new WebCPU_Exception(2, ["Attempt to access to undefined value."]);
		}
		return data;
	},
	writeData: function(env, data){
		if(this.memoryPage.data[1].data.length <= this.addressOffset){
			throw new WebCPU_Exception(2, ["Attempt to access to out of pointer range."]);
		}
		this.memoryPage.data[1].data[this.addressOffset] = data;
	},
	getCopy: function(){
		var copy = new WebCPU_Pointer();
		copy.memoryPage = this.memoryPage;
		copy.memoryType = this.memoryType;
		copy.memoryTypeStr = this.memoryTypeStr;
		copy.addressOffset = this.addressOffset;
		copy.labelNumber = this.labelNumber;
		return copy;
	},
	verifySameMemoryPageAs: function(p){
		if(p && p.memoryPage && this.memoryPage && this.memoryPage == p.memoryPage){
			return true;
		}
		return false;
	}
}
