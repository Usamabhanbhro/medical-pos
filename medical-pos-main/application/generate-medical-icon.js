const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const path = require('path');
const fs = require('fs');

const inputSvg = path.join(__dirname, 'medical-icon.svg');
const outputPngBase = path.join(__dirname, 'medical-icon');
const outputIco = path.join(__dirname, 'medical-icon.ico');

// Standard icon sizes for Windows
const sizes = [16, 32, 48, 64, 128, 256];
const pngFiles = [];

(async () => {
  console.log('Converting medical icon to PNG and ICO formats...\n');
  
  // Convert SVG to PNGs of multiple sizes
  for (const size of sizes) {
    const pngFile = `${outputPngBase}-${size}.png`;
    await sharp(inputSvg)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(pngFile);
    pngFiles.push(pngFile);
    console.log(`✓ Created PNG (${size}x${size}): ${pngFile}`);
  }

  // Create a standard 512x512 PNG for general use
  const mainPng = `${outputPngBase}.png`;
  await sharp(inputSvg)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(mainPng);
  console.log(`✓ Created main PNG (512x512): ${mainPng}`);

  // Convert PNGs to ICO (Windows icon format)
  console.log('\nConverting to ICO format...');
  pngToIco(pngFiles)
    .then(buf => {
      fs.writeFileSync(outputIco, buf);
      console.log(`✓ ICO icon created: ${outputIco}`);
      console.log('\n✅ All icons generated successfully!');
      console.log('\nGenerated files:');
      console.log('  - medical-icon.png (512x512) - Main icon');
      console.log('  - medical-icon.ico - Windows icon');
      console.log('  - medical-icon-16.png through medical-icon-256.png - Various sizes');
    })
    .catch(err => {
      console.error('❌ Error creating ICO:', err);
      console.log('\nNote: PNG files were created successfully.');
    });
})();
