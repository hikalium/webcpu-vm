//既存クラス拡張
if(!Function.prototype.extend){
	Function.prototype.extend = function(baseConstructor, newPrototype){
		// http://sourceforge.jp/projects/h58pcdgame/scm/git/GameScriptCoreLibrary/blobs/master/www/corelib/jsbase.js
		//最初にベースクラスのプロトタイプを引き継ぐ。
		var F = function(){};
		F.prototype = baseConstructor.prototype;
		this.prototype = new F();
		//新たなプロトタイプを追加・上書きする。
		if(newPrototype){
			for(var prop in newPrototype){
				this.prototype[prop] = newPrototype[prop];
			}
		}
		//コンストラクタを設定
		this.prototype.constructor = this;
		//ベースクラスのコンストラクタを設定
		this.base = baseConstructor;
		
		return this;
	};
}

if(!CanvasRenderingContext2D.prototype.fillEllipse){
	CanvasRenderingContext2D.prototype.fillEllipse = function(x, y, w, h) {
		//http://spphire9.wordpress.com/2010/03/08/%E3%83%99%E3%82%B8%E3%82%A7%E6%9B%B2%E7%B7%9A%E3%81%A7%E6%A5%95%E5%86%86%E3%82%92%E6%8F%8F%E3%81%8F3/
		//矩形(x, y, w, h)に内接する楕円を塗りつぶす
		var halfWidth = w >> 1;
		var halfHeight = h >> 1;
		var x0 = x + halfWidth;
		var y1 = y + halfHeight;
		this.beginPath();
		var cw = 4.0 * (Math.sqrt(2.0) - 1.0) * halfWidth / 3.0;
		var ch = 4.0 * (Math.sqrt(2.0) - 1.0) * halfHeight / 3.0;
		this.moveTo(x0, y);
		this.bezierCurveTo(x0 + cw, y, x + w, y1 - ch, x + w, y1);
		this.bezierCurveTo(x + w, y1 + ch, x0 + cw, y + h, x0, y + h);
		this.bezierCurveTo(x0 - cw, y + h, x, y1 + ch, x, y1);
		this.bezierCurveTo(x, y1 - ch, x0 - cw, y, x0, y);
		this.closePath();
		this.fill();
	};
}