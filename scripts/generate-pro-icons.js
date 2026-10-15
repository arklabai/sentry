import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Deep Cosmic Radial Background Glow -->
    <radialGradient id="ambientGlow" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.45"/>
      <stop offset="45%" stop-color="#1d4ed8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#030712" stop-opacity="0"/>
    </radialGradient>

    <!-- Outer Beveled Shield Rim -->
    <linearGradient id="shieldRim" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9"/>
      <stop offset="25%" stop-color="#00d2ff"/>
      <stop offset="60%" stop-color="#2563eb"/>
      <stop offset="85%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>

    <!-- Shield Face Gradient -->
    <linearGradient id="shieldPlate" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="40%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#04060a"/>
    </linearGradient>

    <!-- Metallic Left Specular Sheen -->
    <linearGradient id="specularSheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </linearGradient>

    <!-- Central Sentry Core / Insignia Gradient -->
    <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="30%" stop-color="#38bdf8"/>
      <stop offset="70%" stop-color="#00d2ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <!-- Inner Core Glow -->
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#0284c7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Ambient Glow -->
  <circle cx="256" cy="240" r="230" fill="url(#ambientGlow)"/>

  <!-- Outer Heavy Shield Rim (Chiseled Cyber Geometry) -->
  <path d="M 256, 28
           C 290, 48 375, 58 440, 68
           C 446, 70 450, 75 450, 82
           C 450, 240 376, 386 261, 478
           C 258, 480 254, 480 251, 478
           C 136, 386 62, 240 62, 82
           C 62, 75 66, 70 72, 68
           C 137, 58 222, 48 256, 28 Z"
        fill="url(#shieldRim)"
        stroke="#38bdf8"
        stroke-width="3"
        stroke-opacity="0.6"/>

  <!-- Shield Inner Body (Recessed Armor Plate) -->
  <path d="M 256, 46
           C 286, 64 366, 73 424, 82
           C 424, 230 358, 362 256, 452
           C 154, 362 88, 230 88, 82
           C 146, 73 226, 64 256, 46 Z"
        fill="url(#shieldPlate)"/>

  <!-- Left Facet Specular Highlight -->
  <path d="M 256, 46
           L 256, 452
           C 154, 362 88, 230 88, 82
           C 146, 73 226, 64 256, 46 Z"
        fill="url(#specularSheen)"/>

  <!-- Inner Cyan Tech Circuit Line -->
  <path d="M 256, 74
           C 280, 89 346, 97 394, 105
           C 394, 218 340, 332 256, 412
           C 172, 332 118, 218 118, 105
           C 166, 97 232, 89 256, 74 Z"
        fill="none"
        stroke="#00f0ff"
        stroke-width="3"
        stroke-opacity="0.35"
        stroke-dasharray="14 6"/>

  <!-- Center Hexagonal Radar Core Ring -->
  <polygon points="256,150 326,190 326,270 256,310 186,270 186,190"
           fill="#070d1a"
           stroke="url(#shieldRim)"
           stroke-width="6"/>

  <!-- Center Core Radial Glow -->
  <circle cx="256" cy="230" r="70" fill="url(#coreGlow)"/>

  <!-- Stylized High-Tech Sentry Monogram / Cyber Falcon Crest (Precision Vectors) -->
  <path d="M 256, 172
           L 302, 198
           L 282, 232
           L 256, 218
           L 230, 232
           L 210, 198 Z"
        fill="url(#coreGradient)"/>

  <path d="M 256, 240
           L 294, 262
           L 256, 288
           L 218, 262 Z"
        fill="url(#coreGradient)"/>

  <!-- Floating Cyan Precision Nodes -->
  <circle cx="256" cy="118" r="5" fill="#00f0ff"/>
  <circle cx="256" cy="344" r="4" fill="#00f0ff"/>
  <circle cx="152" cy="230" r="3.5" fill="#38bdf8"/>
  <circle cx="360" cy="230" r="3.5" fill="#38bdf8"/>
</svg>`;

const publicIconsDir = path.resolve(__dirname, '../public/icons');
const distIconsDir = path.resolve(__dirname, '../dist/icons');
const tmpSvgPath = '/tmp/sentry-pro-icon.svg';

fs.writeFileSync(tmpSvgPath, svgContent);

// Also save SVG to public/icons/icon.svg
fs.writeFileSync(path.join(publicIconsDir, 'icon.svg'), svgContent);

console.log('[1] Generating 512x512 Master Render via QuickLook/CoreGraphics...');
execSync(`qlmanage -t -s 512 -o /tmp ${tmpSvgPath}`, { stdio: 'pipe' });

const masterPng = '/tmp/sentry-pro-icon.svg.png';

[publicIconsDir, distIconsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  [16, 32, 48, 128].forEach((size) => {
    const target = path.join(dir, `icon-${size}.png`);
    execSync(`sips -z ${size} ${size} ${masterPng} --out ${target}`, { stdio: 'pipe' });
    console.log(`[PASS] Rendered ${path.basename(dir)}/icon-${size}.png (${size}x${size})`);
  });
});

console.log('All professional high-res shield icons generated successfully!');
