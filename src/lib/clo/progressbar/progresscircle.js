var ProgressCircle = function(canvasName, spanName, options) {

	this.canvas = document.getElementById(canvasName);

	this.ctx = this.canvas.getContext('2d');
	this.ctx.translate(35 , 35);
	this.ctx.rotate(-0.5 * Math.PI);


	this.imd = this.ctx.getImageData(0, 0, 70, 70);

	if(typeof(G_vmlCanvasManager) !== 'undefined') {
		G_vmlCanvasManager.initElement(this.canvas);
	}

	this.span = document.getElementById(spanName);
};

ProgressCircle.prototype.draw = function(percent, color, lineWidth) {
	if(this.span !== null)
		this.span.textContent = percent + '%';
	//this.ctx.globalAlpha = 1;
	this.ctx.putImageData(this.imd, 0, 0);
	this.ctx.beginPath();	
	this.ctx.strokeStyle = color;
	this.ctx.lineCap = 'round';
	this.ctx.lineWidth = lineWidth;
	this.ctx.arc(0, 0, 30, 0, Math.PI * 2 * (percent / 100), false);
	this.ctx.stroke();
};