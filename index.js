const canvasSize = [500, 500];

// Canvas Stuff
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = canvasSize[0];
canvas.height = canvasSize[1];

var imgData = ctx.createImageData(canvasSize[0], canvasSize[1]);

let isDrawing = false;
let x = 0;
let y = 0;
var offsetX;
var offsetY;

function startup() {
	canvas.addEventListener("touchstart", handleStart);
	canvas.addEventListener("touchend", handleEnd);
	canvas.addEventListener("touchcancel", handleCancel);
	canvas.addEventListener("touchmove", handleMove);
	canvas.addEventListener("mousedown", (e) => {
		x = e.offsetX;
		y = e.offsetY;
		isDrawing = true;
	});

	canvas.addEventListener("mousemove", (e) => {
		if (isDrawing) {
			drawLine(ctx, x, y, e.offsetX, e.offsetY);
			x = e.offsetX;
			y = e.offsetY;
		}
	});

	canvas.addEventListener("mouseup", (e) => {
		if (isDrawing) {
			drawLine(ctx, x, y, e.offsetX, e.offsetY);
			x = 0;
			y = 0;
			isDrawing = false;
		}
	});
}

document.addEventListener("DOMContentLoaded", startup);

const ongoingTouches = [];

function handleStart(evt) {
	evt.preventDefault();
	const touches = evt.changedTouches;
	offsetX = canvas.getBoundingClientRect().left;
	offsetY = canvas.getBoundingClientRect().top;
	for (let i = 0; i < touches.length; i++) {
		ongoingTouches.push(copyTouch(touches[i]));
	}
}

function handleMove(evt) {
	evt.preventDefault();
	const touches = evt.changedTouches;
	for (let i = 0; i < touches.length; i++) {
		const color = document.getElementById("selColor").value;
		const idx = ongoingTouchIndexById(touches[i].identifier);
		if (idx >= 0) {
			ctx.beginPath();
			ctx.moveTo(ongoingTouches[idx].clientX - offsetX, ongoingTouches[idx].clientY - offsetY);
			ctx.lineTo(touches[i].clientX - offsetX, touches[i].clientY - offsetY);
			ctx.lineWidth = document.getElementById("selWidth").value;
			ctx.strokeStyle = color;
			ctx.lineJoin = "round";
			ctx.closePath();
			ctx.stroke();
			ongoingTouches.splice(idx, 1, copyTouch(touches[i])); // swap in the new touch record
		}
	}
}

function handleEnd(evt) {
	evt.preventDefault();
	const touches = evt.changedTouches;
	for (let i = 0; i < touches.length; i++) {
		const color = document.getElementById("selColor").value;
		let idx = ongoingTouchIndexById(touches[i].identifier);
		if (idx >= 0) {
			ctx.lineWidth = document.getElementById("selWidth").value;
			ctx.fillStyle = color;
			ongoingTouches.splice(idx, 1); // remove it; we're done
		}
	}
}

function handleCancel(evt) {
	evt.preventDefault();
	const touches = evt.changedTouches;
	for (let i = 0; i < touches.length; i++) {
		let idx = ongoingTouchIndexById(touches[i].identifier);
		ongoingTouches.splice(idx, 1); // remove it; we're done
	}
}

function drawLine(ctx, x1, y1, x2, y2) {
	let smallestDistance = distance(points[0].position, [x1, y1]);
	let array = "points";
	let smallestDistancePointIndex = 0;
	let i = 0;
	for (let point of points) {
		if (distance(point.position, [x1, y1]) < smallestDistance) {
			smallestDistance = distance(point.position, [x1, y1]);
			smallestDistancePointIndex = i;
			array = "points";
		}
		i++;
	}
	i = 0;
	for (let object of permanentObjects) {
		if (object.type == "circle" && distance(object.position, [x1, y1]) < smallestDistance) {
			smallestDistance = distance(object.position, [x1, y1]);
			smallestDistancePointIndex = i;
			array = "objects";
		}
		i++;
	}
	if (array == "points") {
		points[smallestDistancePointIndex].position = [x2, y2];
	} else {
		permanentObjects[smallestDistancePointIndex].position = [x2, y2];
	}
}

// Main Code
class Circle {
	constructor(position, radius, color, fill = true, width = 1) {
		this.type = "circle";
		this.position = position;
		this.radius = radius;
		this.color = color;
		this.fill = fill;
		this.width = width;
	}
	get pixels() {
		return this.calcPixels();
	}
	calcPixels() {
		let pixels = [];
		for (let i = 0; i < 4 * this.radius * this.radius; i++) {
			let x = i % (2 * this.radius);
			let y = Math.floor(i / (2 * this.radius));
			let d = distance([this.radius, this.radius], [x, y]);
			let isValid = this.fill ? d <= this.radius : d >= this.radius - this.width && d <= this.radius;
			if (isValid) {
				if (x + this.position[0] - this.radius >= 0 && y + this.position[1] - this.radius >= 0) {
					pixels.push({
						position: [x + this.position[0] - this.radius, y + this.position[1] - this.radius],
						data: [this.color[0], this.color[1], this.color[2], 255],
					});
				}
			}
		}
		return pixels;
	}
}
class Line {
	constructor(p1, p2, width, color) {
		this.type = "line";
		this.p1 = p1;
		this.p2 = p2;
		this.width = width;
		this.color = color;
	}
	get pixels() {
		return this.calcPixels();
	}
	calcPixels() {
		let pixels = [];
		let x0 = Math.round(this.p1[0]);
		let y0 = Math.round(this.p1[1]);
		let x1 = Math.round(this.p2[0]);
		let y1 = Math.round(this.p2[1]);

		let dx = Math.abs(x1 - x0);
		let dy = Math.abs(y1 - y0);
		let sx = x0 < x1 ? 1 : -1;
		let sy = y0 < y1 ? 1 : -1;
		let err = dx - dy;

		while (true) {
			if (x0 >= 0 && x0 < canvasSize[0] && y0 >= 0 && y0 < canvasSize[1]) {
				pixels.push({
					position: [x0, y0],
					data: [this.color[0], this.color[1], this.color[2], 255],
				});
			}
			if (x0 === x1 && y0 === y1) break;
			let e2 = 2 * err;
			if (e2 > -dy) {
				err -= dy;
				x0 += sx;
			}
			if (e2 < dx) {
				err += dx;
				y0 += sy;
			}
		}
		return pixels;
	}

	makeValidator([x1, y1], [x2, y2], width) {
		let slope = (y2 - y1) / (x2 - x1);
		return function (x, y) {
			return Math.abs(y - y1 - slope * (x - x1)) <= width;
		};
	}
}

var permanentObjects = [new Circle([250, 250], 10, [0, 255, 0], true, 1)];
var objects = [new Circle([250, 250], 10, [0, 255, 0], true, 1)];
let b = 1;
function drawImage() {
	//Fill with blank space
	for (let i = 0; i < imgData.data.length; i += 4) {
		let x = Math.floor((i / 4) % canvasSize[1]);
		let y = Math.floor(i / 4 / canvasSize[1]);
		let E = Math.hypot(plot[y][x][0], plot[y][x][1]);
		if (E > 255) E = 255;
		imgData.data[i + 0] = E; //R
		imgData.data[i + 1] = 0; //G
		imgData.data[i + 2] = 0; //B
		imgData.data[i + 3] = 255; //Alpha
	}
	//Add objects
	for (let object of objects) {
		let pixels = object.pixels;
		for (let pixel of pixels) {
			let i = 4 * (pixel.position[1] * canvasSize[0] + pixel.position[0]);
			imgData.data[i + 0] = pixel.data[0]; //R
			imgData.data[i + 1] = pixel.data[1]; //G
			imgData.data[i + 2] = pixel.data[2]; //B
			imgData.data[i + 3] = pixel.data[3]; //Alpha
		}
	}
	ctx.putImageData(imgData, 0, 0);
}
//Electric code
var points = [
	{ position: [100, 151], charge: 10e-7 },
	{ position: [120, 151], charge: 10e-7 },
	{ position: [140, 151], charge: 10e-7 },
	{ position: [160, 151], charge: 10e-7 },
	{ position: [180, 151], charge: 10e-7 },
	{ position: [200, 151], charge: 10e-7 },
	{ position: [220, 151], charge: 10e-7 },
	{ position: [240, 151], charge: 10e-7 },
	{ position: [260, 151], charge: 10e-7 },
	{ position: [280, 151], charge: 10e-7 },
	{ position: [300, 151], charge: 10e-7 },
	{ position: [320, 151], charge: 10e-7 },
	{ position: [340, 151], charge: 10e-7 },
	{ position: [360, 151], charge: 10e-7 },
	{ position: [380, 151], charge: 10e-7 },
	{ position: [400, 151], charge: 10e-7 },
	{ position: [100, 349], charge: -10e-7 },
	{ position: [120, 349], charge: -10e-7 },
	{ position: [140, 349], charge: -10e-7 },
	{ position: [160, 349], charge: -10e-7 },
	{ position: [180, 349], charge: -10e-7 },
	{ position: [200, 349], charge: -10e-7 },
	{ position: [220, 349], charge: -10e-7 },
	{ position: [240, 349], charge: -10e-7 },
	{ position: [260, 349], charge: -10e-7 },
	{ position: [280, 349], charge: -10e-7 },
	{ position: [300, 349], charge: -10e-7 },
	{ position: [320, 349], charge: -10e-7 },
	{ position: [340, 349], charge: -10e-7 },
	{ position: [360, 349], charge: -10e-7 },
	{ position: [380, 349], charge: -10e-7 },
	{ position: [400, 349], charge: -10e-7 },
];
const k = 9e9;
function calcPlot() {
	let plot = [];
	//generate empty plot
	for (let y = 0; y < canvasSize[1]; y += 1) {
		let line = [];
		for (let x = 0; x < canvasSize[0]; x += 1) {
			line.push([0, 0]);
		}
		plot.push(line);
	}
	for (let y = 0; y < canvasSize[1]; y += 1) {
		for (let x = 0; x < canvasSize[0]; x += 1) {
			for (let point of points) {
				//console.log(point.position, [x, y]);
				let r = distance(point.position, [x, y]);
				let dx = x - point.position[0];
				let dy = y - point.position[1];
				let E_amount = Math.abs((k * point.charge) / (r * r));
				let tanx = (dx / r) * Math.sign(point.charge);
				let tany = (dy / r) * Math.sign(point.charge);
				plot[y][x][0] += tanx * E_amount;
				plot[y][x][1] += tany * E_amount;
			}
		}
	}
	return plot;
}
function drawVectorField() {
	let step = 20; // spacing between vectors
	let scale = 1000; // scale down vectors to make them visible
	let vectorCountX = Math.floor(canvasSize[0] / step);
	let vectorCountY = Math.floor(canvasSize[1] / step);

	for (let y = 0; y < vectorCountY; y++) {
		for (let x = 0; x < vectorCountX; x++) {
			let centreX = (x + 0.5) * step;
			let centreY = (y + 0.5) * step;

			// sample the vector field at this position
			let vec = plot[Math.floor(centreY)][Math.floor(centreX)];
			let vx = vec[0] * scale;
			let vy = vec[1] * scale;

			if (!vec) continue;

			if (vx > 10) {
				let ratio = 10 / vx;
				vx = 10;
				vy *= ratio;
			}
			if (vy > 10) {
				let ratio = 10 / vy;
				vy = 10;
				vx *= ratio;
			}
			if (vx < -10) {
				let ratio = 10 / vx;
				vx = -10;
				vy *= Math.abs(ratio);
			}
			if (vy < -10) {
				let ratio = 10 / vy;
				vy = -10;
				vx *= Math.abs(ratio);
			}

			let baseX = centreX - Math.round(vx / 2);
			let baseY = centreY - Math.round(vy / 2);

			let endX = centreX + Math.round(vx / 2);
			let endY = centreY + Math.round(vy / 2);

			objects.push(new Line([baseX, baseY], [endX, endY], 1, [0, 0, 255]));
			//objects.push(new Line([x * step, y * step], [(x + 1) * step, (y + 1) * step], 1, [0, 0, 255]));
			//console.log(vx, vy);
		}
	}
}

//Loop
let plot = calcPlot();
console.log(plot);
let t = 0;
drawImage();
setInterval(loop, 250);
function loop() {
	plot = calcPlot();
	drawVectorField();
	drawImage();
	objects = permanentObjects;
	if (t % 10 == 0) {
		for (let object of objects) {
			if (object.type == "circle") console.log(plot[object.position[1]][object.position[0]]);
		}
	}
	t++;
}
//Function Toolbox
function distance(point1, point2) {
	return Math.hypot(point1[0] - point2[0], point1[1] - point2[1]);
}

//console.log(imgData);
