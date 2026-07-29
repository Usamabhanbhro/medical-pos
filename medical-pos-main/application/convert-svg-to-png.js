const sharp = require('sharp');
const path = require('path');

const inputSvg = path.join(__dirname, 'renderer', 'public', 'icon.svg');
const outputPng = path.join(__dirname, 'renderer', 'public', 'icon.png');
const outputIco = path.join(__dirname, 'renderer', 'public', 'icon.ico');

// Convert SVG to PNG (256x256 for best quality)
sharp(inputSvg)
  .resize(256, 256)
  .png()
  .toFile(outputPng)
  .then(() => {
    console.log('PNG icon created:', outputPng);
    // Optionally, convert PNG to ICO using sharp
    return sharp(outputPng)
      .resize(256, 256)
      .toFile(outputIco);
  })
  .then(() => {
    console.log('ICO icon created:', outputIco);
  })
  .catch(err => console.error('Error:', err));