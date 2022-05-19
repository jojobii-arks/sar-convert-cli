const fsp = require('fs/promises');

const { BlowfishContext } = require('./parser/blowfish');
const { sarSchema } = require('./parser/sarstruct');
const struct = require('./parser/struct');
const prs = require('./parser/prs');

let result;
fsp
  .readFile('./sar-examples/IoBlush.sar')
  .then(buffer => {
    result = processSarBuffer(buffer);
  })
  .then(() =>
    fsp.writeFile(
      './output/io-blush-data.json',
      JSON.stringify(result, null, 2)
    )
  )
  .catch(err => console.error(err));

function processSarBuffer(buffer) {
  let u8view = new Uint8Array(buffer);
  const flag = u8view[3];
  if (u8view[0] !== 115 || u8view[1] !== 97 || u8view[2] !== 114) {
    console.error('not a SAR file');
    process.exit(1);
  }

  if (flag !== 0x84 && flag !== 0x04) {
    console.error(`invalid flag ${flag}`);
  }

  u8view = u8view.slice(4, buffer.byteLength);
  const keyBuffer = Uint8Array.of(0x09, 0x07, 0xc1, 0x2b).buffer;
  const context = new BlowfishContext(keyBuffer);
  try {
    context.decrypt(u8view.buffer);
    let resultBuffer = u8view.buffer;
    if (flag === 0x84) {
      u8view = u8view.map(v => v ^ 0x95);
      resultBuffer = prs.decompress(u8view.buffer);
    }
    const parsed = struct.parse(resultBuffer, sarSchema);
    return parsed;
  } catch (err) {
    console.error(err);
  }
}
