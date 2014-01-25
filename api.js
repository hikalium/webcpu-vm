function BitmapCanvas(){
	this.canvasDOMObject = null;
	this.canvasContext = null;
	this.bufferImageData = null;
	this.bmp = null;
	this.width = undefined;
	this.height = undefined;
}
BitmapCanvas.prototype = {
	setCanvas: function(canvasDOMObject){
		this.canvasDOMObject = canvasDOMObject;
		if(canvasDOMObject){
			this.canvasContext = this.canvasDOMObject.getContext("2d");
			this.width = this.canvasDOMObject.width;
			this.height = this.canvasDOMObject.height;
			this.bufferImageData = this.canvasContext.getImageData(0, 0, this.width, this.height);
			this.bmp = this.bufferImageData.data;
		} else{
			this.bmp = null;
			this.canvasContext = null;
			this.bufferImageData = null;
			this.width = undefined;
			this.height = undefined;
		}
	},
	drawPoint: function(x, y, color, mode){
		if(this.bmp){
			if(mode === undefined){
				mode = 0;
			} else{
				mode &= 0x03;
			}
			x += 0.5;
			x |= 0;
			y += 0.5;
			y |= 0;
			//RGBARGBA...
			if(mode == 0){
				//PSET
				this.bmp[4 * (y * this.width + x) + 0] = (color >> 16) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 1] = (color >> 8) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 2] = color & 0xFF;
			} else if(mode == 1){
				//OR
				this.bmp[4 * (y * this.width + x) + 0] |= (color >> 16) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 1] |= (color >> 8) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 2] |= color & 0xFF;
			} else if(mode == 2){
				//XOR
				this.bmp[4 * (y * this.width + x) + 0] ^= (color >> 16) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 1] ^= (color >> 8) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 2] ^= color & 0xFF;
			} else if(mode == 3){
				//AND
				this.bmp[4 * (y * this.width + x) + 0] &= (color >> 16) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 1] &= (color >> 8) & 0xFF;
				this.bmp[4 * (y * this.width + x) + 2] &= color & 0xFF;
			}
		}
	},
	drawLine: function(x0, y0, x1, y1, color, mode){
		//整数座標のみ対応。
		x0 |= 0;
		y0 |= 0;
		x1 |= 0;
		y1 |= 0;
		var dx = x1 - x0;
		var dy = y1 - y0;
		var dxa = dx;
		var dya = dy;
		var l;
		
		if(dxa < 0){
			dxa = -dxa;
		}
		if(dya < 0){
			dya = -dya;
		}
		
		if(dxa > dya){
			//x軸基準
			l = dxa + 1;
			if(x0 > x1){
				dx = -1;
			} else{
				dx = 1;
			}
			dy /= l;
		} else{
			//y軸基準
			l = dya + 1;
			if(y0 > y1){
				dy = -1;
			} else{
				dy = 1;
			}
			dx /= l;
		}
		
		for(var i = 0; i < l; i++){
			this.drawPoint(x0 + dx * i, y0 + dy * i, color, mode);
		}
	},
	fillRect: function(xSize, ySize, x0, y0, col, mode){
	
	},
	fillOval: function(xSize, ySize, x0, y0, col, mode){
	
	},
	flush: function(){
		if(this.bufferImageData){
			this.canvasContext.putImageData(this.bufferImageData, 0, 0);
		}
	},
}

function WebCPU_API(){
	this.mainWindowCanvas = null;
	this.mainWindowContext = null;
	//this.mainWindowBufferCanvas = document.createElement('canvas');
	//this.mainWindowBufferContext = this.mainWindowBufferCanvas.getContext("2d");
	//
	this.bitmapCanvas = new BitmapCanvas();
	//
	//this.mainWindowBufferCanvas.width = 640;
	//this.mainWindowBufferCanvas.height = 480;
	//this.initCanvas(this.mainWindowBufferCanvas);
}
WebCPU_API.prototype = {
	executeAPI: function(env){
		var r = env.registers.Integer;
		var APIID = r[0x30];
		switch(APIID){
			case 0xff40:
				//openWin
				this.API_openWin(env, r[0x31], r[0x32])
				break;
			case 0xff41:
				//openWin
				this.API_flushWin(env, r[0x31], r[0x32], r[0x33], r[0x34])
				break;
			case 0xff44:
				//drawPoint
				this.API_drawPoint(env, r[0x31], r[0x32], r[0x33], r[0x34]);
				break;
			case 0xff45:
				//drawLine
				this.API_drawLine(env, r[0x31], r[0x32], r[0x33], r[0x34], r[0x35], r[0x36]);
				break;
			case 0xff46:
				//fillRect
				this.API_fillRect(env, r[0x31], r[0x32], r[0x33], r[0x34], r[0x35], r[0x36]);
				break;
			case 0xff47:
				//fillOval
				this.API_fillOval(env, r[0x31], r[0x32], r[0x33], r[0x34], r[0x35], r[0x36]);
				break;
			default:
				throw new WebCPU_Exception(0, ["Unknown API Number " + APIID.toString(16)]);
		}
		env.goToPointerRegister(0x30);
	},
	colorTable:[
		0x000000, 
		0xff0000, 
		0x00ff00, 
		0xffff00, 
		0x0000ff, 
		0xff00ff, 
		0x00ffff, 
		0xffffff
	],
	setMainWindowCanvasDOMObject: function(obj){
		this.mainWindowCanvas = obj;
		if(this.mainWindowCanvas){
			this.mainWindowContext = this.mainWindowCanvas.getContext('2d')
			this.initCanvas(this.mainWindowCanvas);
			//
			this.bitmapCanvas.setCanvas(this.mainWindowCanvas);
		} else{
			this.mainWindowContext = null;
		}
	},
	initCanvas: function(c){
		var d = c.getContext('2d');
		d.fillStyle = "rgba(0,0,0,1)";
		d.strokeStyle = "rgba(255, 255, 255, 1)";
		d.lineWidth = 1;
		//描画域は必ず黒で初期化されます。
		d.fillRect(0, 0, c.width, c.height);
	},
	//
	API_openWin: function(env, xSize, ySize){
		env.message("junkApi_openWin();\n", 20);
		this.mainWindowCanvas.width = xSize;
		this.mainWindowCanvas.height = ySize;
		//this.mainWindowBufferCanvas.width = xSize;
		//this.mainWindowBufferCanvas.height = ySize;
		this.initCanvas(this.mainWindowCanvas);
		this.bitmapCanvas.setCanvas(this.mainWindowCanvas);
	},
	API_flushWin: function(env, xSize, ySize, x0, y0){
		env.message("junkApi_flushWin();\n", 20);
		//this.mainWindowContext.drawImage(this.mainWindowBufferCanvas, x0, y0, xSize, ySize, 0, 0, xSize, ySize);
		this.bitmapCanvas.flush();
	},
	API_drawPoint: function(env, mode, x, y, col){
		env.message("junkApi_drawPoint();\n", 20);
		if((mode & 0x04) != 0){
			col = this.colorTable[col];
		}
		//this.mainWindowBufferContext.fillStyle = "#" + ("000000" + col.toString(16)).slice(-6).toUpperCase();
		//this.mainWindowBufferContext.fillRect(x, y, 1, 1);
		this.bitmapCanvas.drawPoint(x, y, col, mode);
	},
	API_drawLine: function(env, mode, x0, y0, x1, y1, col){
		env.message("junkApi_drawLine();\n", 20);

		if((mode & 0x04) != 0){
			col = this.colorTable[col];
		}
		/*
		this.mainWindowBufferContext.strokeStyle = "#" + ("000000" + col.toString(16)).slice(-6).toUpperCase();
		this.mainWindowBufferContext.beginPath();
		this.mainWindowBufferContext.moveTo(x0, y0);
		this.mainWindowBufferContext.lineTo(x1, y1);
		this.mainWindowBufferContext.closePath();
		this.mainWindowBufferContext.stroke();
		*/
		this.bitmapCanvas.drawLine(x0, y0, x1, y1, col, mode);
	},
	API_fillRect: function(env, mode, xSize, ySize, x0, y0, col){
		env.message("junkApi_fillRect();\n", 20);

		if((mode & 0x04) != 0){
			col = this.colorTable[col];
		}
		/*
		this.mainWindowBufferContext.fillStyle = "#" + ("000000" + col.toString(16)).slice(-6).toUpperCase();
		this.mainWindowBufferContext.fillRect(x0, y0, xSize, ySize);
		*/
	},
	API_fillOval: function(env, mode, xSize, ySize, x0, y0, col){
		env.message("junkApi_fillRect();\n", 20);

		if((mode & 0x04) != 0){
			col = this.colorTable[col];
		}
		/*
		this.mainWindowBufferContext.fillStyle = "#" + ("000000" + col.toString(16)).slice(-6).toUpperCase();
		this.mainWindowBufferContext.fillEllipse(x0, y0, xSize, ySize);
		*/
	},
}
