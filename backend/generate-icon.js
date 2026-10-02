const { Jimp } = require('jimp');
const path = require('path');

async function createPaddedIcon() {
  try {
    const logoPath = path.join(__dirname, '../app/assets/logo.png');
    const logo = await Jimp.read(logoPath);
    
    // Scale logo down
    logo.resize({ w: 600 });
    
    // Create new image 1024x1024 white
    const bg = new Jimp({ width: 1024, height: 1024, color: 0xFFFFFFFF });
    
    const x = (1024 - logo.bitmap.width) / 2;
    const y = (1024 - logo.bitmap.height) / 2;
    
    bg.composite(logo, x, y);
    
    const outputPath = path.join(__dirname, '../app/assets/padded-icon.png');
    await bg.write(outputPath);
    console.log('Padded icon created successfully at', outputPath);
  } catch (error) {
    console.error('Error creating padded icon:', error);
  }
}

createPaddedIcon();
