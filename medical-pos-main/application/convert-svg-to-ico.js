const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const path = require('path');
const fs = require('fs');

const inputSvg = path.join(__dirname, 'renderer', 'public', 'icon.png');
const outputPngBase = path.join(__dirname, 'renderer', 'public', 'icon');
const outputIco = path.join(__dirname, 'renderer', 'public', 'icon.ico');

const sizes = [16, 32, 48, 64, 128, 256];
const pngFiles = [];

(async () => {
  // Convert SVG to PNGs of multiple sizes
  for (const size of sizes) {
    const pngFile = `${outputPngBase}-${size}.png`;
    await sharp(inputSvg)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(pngFile);
    pngFiles.push(pngFile);
    console.log(`Created PNG: ${pngFile}`);
  }

  // Convert PNGs to ICO
  pngToIco(pngFiles)
    .then(buf => {
      fs.writeFileSync(outputIco, buf);
      console.log('ICO icon created:', outputIco);
    })
    .catch(err => console.error('Error creating ICO:', err));
})();
