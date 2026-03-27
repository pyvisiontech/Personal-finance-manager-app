const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function fixImage(filename) {
  const inputPath = path.join(__dirname, 'assets', filename);
  const outputPath = path.join(__dirname, 'assets', 'fixed-' + filename);
  
  if (!fs.existsSync(inputPath)) {
    console.log(`File not found: ${inputPath}`);
    return;
  }
  
  console.log(`Fixing ${filename}...`);
  try {
    await sharp(inputPath)
      .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
      .toFile(outputPath);
    
    // Replace original
    fs.unlinkSync(inputPath);
    fs.renameSync(outputPath, inputPath);
    console.log(`Successfully fixed ${filename}`);
  } catch (err) {
    console.error(`Error fixing ${filename}:`, err.message);
  }
}

async function run() {
  await fixImage('splash-icon-v5.png');
  await fixImage('icon-v5.png');
  await fixImage('adaptive-icon-v5.png');
  console.log('Done!');
}

run();
