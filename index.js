const fsp = require('fs/promises');
const { createCanvas, loadImage } = require('canvas');

const data = require('./output/io-blush-data.json');

const layers = data.layers.reverse();

const canvas = createCanvas(2000, 1000);
const ctx = canvas.getContext('2d');
ctx.antialias = 'subpixel';
ctx.quality = 'bilinear';

const i = 0;
console.log(layers.length);
function renderNext(i) {
	const layer = layers[i];
	const corners = [
		{
			x: layer.points.topLeft.x * 4,
			y: layer.points.topLeft.y * 4
		},
		{
			x: layer.points.topRight.x * 4,
			y: layer.points.topRight.y * 4
		},
		{
			x: layer.points.bottomRight.x * 4,
			y: layer.points.bottomRight.y * 4
		},
		{
			x: layer.points.bottomLeft.x * 4,
			y: layer.points.bottomLeft.y * 4
		}
	];
	const src = `./res/assets/${layer.props.textureIndex + 1}.png`;
	loadImage(src).then(img => {
		console.log('layer index:', i);
		const tempCanvas = render(img, corners, layer.props);
		ctx.drawImage(tempCanvas, 0, 0);
		if (i < layers.length - 1) {
			i++;
			renderNext(i);
		} else {
			console.log('finished');
			const pngData = canvas.createPNGStream();
			fsp
				.writeFile('./output/io-blush.png', pngData)
				.then(() => console.log('save successful'))
				.catch(console.error);
		}
	});
}

renderNext(i);

function render(img, corners, layer) {
	const canvas = createCanvas(2000, 1000);
	const ctx = canvas.getContext('2d');
	const step = 1;
	ctx.antialias = 'subpixel';
	ctx.quality = 'bilinear';

	let p1;
	let p2;
	let p3;
	let p4;
	let y1c;
	let y2c;
	let y1n;
	let y2n;
	const w = img.width - 1; // -1 to give room for the "next" points
	const h = img.height - 1;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for (let y = 0; y < h; y += step) {
		for (let x = 0; x < w; x += step) {
			y1c = lerp(corners[0], corners[3], y / h);
			y2c = lerp(corners[1], corners[2], y / h);
			y1n = lerp(corners[0], corners[3], (y + step) / h);
			y2n = lerp(corners[1], corners[2], (y + step) / h);

			// corners of the new sub-divided cell p1 (ul) -> p2 (ur) -> p3 (br) -> p4 (bl)
			p1 = lerp(y1c, y2c, x / w);
			p2 = lerp(y1c, y2c, (x + step) / w);
			p3 = lerp(y1n, y2n, (x + step) / w);
			p4 = lerp(y1n, y2n, x / w);

			ctx.drawImage(
				img,
				x,
				y,
				step,
				step,
				p1.x,
				p1.y, // get most coverage for w/h:
				Math.ceil(
					Math.max(step, Math.abs(p2.x - p1.x), Math.abs(p4.x - p3.x))
				) + 1,
				Math.ceil(
					Math.max(step, Math.abs(p1.y - p4.y), Math.abs(p2.y - p3.y))
				) + 1
			);
		}
	}

	let { colorR, colorG, colorB, transparency } = layer;
	colorR *= 4;
	colorG *= 4;
	colorB *= 4;
	transparency = transparency / 7;

	const imageData = ctx.getImageData(0, 0, 1280, 1280);
	for (let i = 0; i < imageData.data.length; i += 4) {
		// Modify pixel data
		imageData.data[i + 0] = colorR; // R value
		imageData.data[i + 1] = colorG; // G value
		imageData.data[i + 2] = colorB; // B value
		imageData.data[i + 3] *= transparency; // A value
	}
	ctx.putImageData(imageData, 0, 0);

	return canvas;
}

function lerp(p1, p2, t) {
	return {
		x: p1.x + (p2.x - p1.x) * t,
		y: p1.y + (p2.y - p1.y) * t
	};
}
