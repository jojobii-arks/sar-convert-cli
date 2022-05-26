const fsp = require('fs/promises');
const { createCanvas, loadImage } = require('canvas');
const [, , filepath] = process.argv;
const processSarBuffer = require('./sar-parse');
const imageCatalogue = require('./res/assetCatalog.json');
const { readFileSync } = require('fs');

fsp
  .readFile(filepath)
  .then(file => {
    // console.log(file);
    return convertSarToPng(file);
  })
  .then(pngBuffer => {
    // console.log(pngBuffer);
    return fsp.writeFile('output.png', pngBuffer);
  })
  .then(console.log)
  .catch(err => console.error(err));

/**
 * Reads a .sar buffer and outputs a .png buffer.
 * @param {ArrayBuffer} - Buffer of .sar file
 * @returns {Promise} - Promise Object Represents PNG Stream.
 */
async function convertSarToPng(buffer) {
  const data = processSarBuffer(buffer);

  if (data.sizeHeight !== 128 || data.sizeWidth !== 193) {
    throw new Error('Unable to process non-standard Symbol Arts');
  }

  const layers = data.layers.reverse();
  const dimensions = { width: 1000, height: 1000 };
  const resolution = 4;
  const step = 3;

  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d');
  ctx.antialias = 'subpixel';
  ctx.quality = 'bilinear';

  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    if (layer && layer.props.visible) {
      const corners = [
        {
          x: layer.points.topLeft.x * resolution,
          y: layer.points.topLeft.y * resolution
        },
        {
          x: layer.points.topRight.x * resolution,
          y: layer.points.topRight.y * resolution
        },
        {
          x: layer.points.bottomRight.x * resolution,
          y: layer.points.bottomRight.y * resolution
        },
        {
          x: layer.points.bottomLeft.x * resolution,
          y: layer.points.bottomLeft.y * resolution
        }
      ];

      const symbolImg = await loadImage(
        `./res/assets/${layer.props.textureIndex + 1}.png`
      );

      console.log(symbolImg);

      const tempCanvas = renderSymbol(
        symbolImg,
        corners,
        layer.props,
        step,
        dimensions
      );
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  const cropped = ctx.getImageData(126, 317, 767, 384);
  const tempCanvas = createCanvas(760, 380);
  const tempctx = tempCanvas.getContext('2d');
  tempctx.putImageData(cropped, 0, 0);
  const pngData = tempCanvas.createPNGStream();

  return pngData;
}

function renderSymbol(img, corners, layer, step, dimensions) {
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext('2d');
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

  const imageData = ctx.getImageData(0, 0, dimensions.width, dimensions.height);
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

// function loadImagesSync() {
//   return imageCatalogue.map(e => {
//     const out = {
//       filepath: e
//     };
//     out.data = readFileSync('./res/' + e);
//     return out;
//   });
// }

module.exports = {
  convertSarToPng
};
