import fs from 'fs';
import { PNG } from 'pngjs';

const inputPath = '/Users/alvindecorous/.gemini/antigravity-ide/brain/d5ed8e88-6db9-4a67-8239-03db135bb5db/media__1786595817339.png';

const srcData = fs.readFileSync(inputPath);
const srcPng = PNG.sync.read(srcData);

console.log(`Source image: ${srcPng.width}x${srcPng.height}`);

// Target square size: 512x512
const targetSize = 512;
const targetPng = new PNG({ width: targetSize, height: targetSize });

// 1. Fill entire canvas with solid white (#FFFFFF)
for (let y = 0; y < targetSize; y++) {
  for (let x = 0; x < targetSize; x++) {
    const idx = (targetSize * y + x) << 2;
    targetPng.data[idx] = 255;     // Red
    targetPng.data[idx + 1] = 255; // Green
    targetPng.data[idx + 2] = 255; // Blue
    targetPng.data[idx + 3] = 255; // Alpha
  }
}

// 2. Calculate scaling to fit nicely with white padding (e.g. 75% of target size = ~384px)
const maxDimension = targetSize * 0.75;
const scale = Math.min(maxDimension / srcPng.width, maxDimension / srcPng.height);
const scaledW = Math.round(srcPng.width * scale);
const scaledH = Math.round(srcPng.height * scale);

const startX = Math.round((targetSize - scaledW) / 2);
const startY = Math.round((targetSize - scaledH) / 2);

console.log(`Scaled: ${scaledW}x${scaledH} placed at (${startX}, ${startY})`);

// 3. Resample and blend onto white background
for (let ty = 0; ty < scaledH; ty++) {
  for (let tx = 0; tx < scaledW; tx++) {
    const srcX = Math.min(Math.floor(tx / scale), srcPng.width - 1);
    const srcY = Math.min(Math.floor(ty / scale), srcPng.height - 1);
    
    const srcIdx = (srcPng.width * srcY + srcX) << 2;
    const destX = startX + tx;
    const destY = startY + ty;
    const destIdx = (targetSize * destY + destX) << 2;
    
    const sR = srcPng.data[srcIdx];
    const sG = srcPng.data[srcIdx + 1];
    const sB = srcPng.data[srcIdx + 2];
    const sA = srcPng.data[srcIdx + 3] / 255.0;
    
    // Alpha blend over white (255, 255, 255)
    targetPng.data[destIdx] = Math.round(sR * sA + 255 * (1 - sA));
    targetPng.data[destIdx + 1] = Math.round(sG * sA + 255 * (1 - sA));
    targetPng.data[destIdx + 2] = Math.round(sB * sA + 255 * (1 - sA));
    targetPng.data[destIdx + 3] = 255;
  }
}

// Write out PNG files
const buffer = PNG.sync.write(targetPng);
fs.writeFileSync('/Users/alvindecorous/Documents/STANLEY ENGRAVING APP/public/favicon.png', buffer);
fs.writeFileSync('/Users/alvindecorous/Documents/STANLEY ENGRAVING APP/public/apple-touch-icon.png', buffer);
fs.writeFileSync('/Users/alvindecorous/Documents/STANLEY ENGRAVING APP/src/assets/images/stanley-bear-logo.png', buffer);

// Also generate a clean SVG containing the white square container and base64 png
const base64Png = buffer.toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FFFFFF" rx="48"/>
  <image href="data:image/png;base64,${base64Png}" width="512" height="512"/>
</svg>`;

fs.writeFileSync('/Users/alvindecorous/Documents/STANLEY ENGRAVING APP/public/favicon.svg', svgContent);
console.log('Successfully generated favicon.png, favicon.svg, and apple-touch-icon.png with white square container!');
