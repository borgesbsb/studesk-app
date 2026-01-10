import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG template do ícone
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background com gradiente -->
  <rect width="${size}" height="${size}" fill="#0f172a" rx="${size * 0.22}"/>

  <!-- Círculo decorativo -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="url(#grad)" opacity="0.15"/>

  <!-- Ícone de livro centralizado -->
  <g transform="translate(${size * 0.3}, ${size * 0.28})">
    <path d="M ${size * 0.2} ${size * 0.05} L ${size * 0.2} ${size * 0.35} M ${size * 0.2} ${size * 0.05} C ${size * 0.18} ${size * 0.03} ${size * 0.15} ${size * 0.02} ${size * 0.125} ${size * 0.02} C ${size * 0.1} ${size * 0.02} ${size * 0.07} ${size * 0.03} ${size * 0.05} ${size * 0.05} L ${size * 0.05} ${size * 0.35} C ${size * 0.07} ${size * 0.33} ${size * 0.1} ${size * 0.32} ${size * 0.125} ${size * 0.32} C ${size * 0.15} ${size * 0.32} ${size * 0.18} ${size * 0.33} ${size * 0.2} ${size * 0.35} M ${size * 0.2} ${size * 0.05} C ${size * 0.22} ${size * 0.03} ${size * 0.25} ${size * 0.02} ${size * 0.275} ${size * 0.02} C ${size * 0.3} ${size * 0.02} ${size * 0.33} ${size * 0.03} ${size * 0.35} ${size * 0.05} L ${size * 0.35} ${size * 0.35} C ${size * 0.33} ${size * 0.33} ${size * 0.3} ${size * 0.32} ${size * 0.275} ${size * 0.32} C ${size * 0.25} ${size * 0.32} ${size * 0.22} ${size * 0.33} ${size * 0.2} ${size * 0.35}"
          stroke="white"
          stroke-width="${size * 0.02}"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"/>
  </g>

  <!-- Texto Studesk -->
  <text x="50%" y="${size * 0.75}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${size * 0.11}"
        font-weight="700"
        fill="white"
        text-anchor="middle"
        letter-spacing="${size * 0.005}">
    Studesk
  </text>
</svg>
`;

const publicDir = path.join(__dirname, '..', 'public');

// Criar diretório se não existir
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generateIcons() {
  try {
    console.log('🎨 Gerando ícones PWA...\n');

    // Gerar ícone 192x192
    const svg192 = Buffer.from(createIconSVG(192));
    await sharp(svg192)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192x192.png'));
    console.log('✅ icon-192x192.png criado');

    // Gerar ícone 512x512
    const svg512 = Buffer.from(createIconSVG(512));
    await sharp(svg512)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));
    console.log('✅ icon-512x512.png criado');

    // Gerar favicon
    await sharp(svg192)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✅ favicon.ico criado');

    // Gerar apple-touch-icon
    await sharp(svg192)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png criado');

    console.log('\n✨ Todos os ícones PWA foram gerados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error);
    process.exit(1);
  }
}

generateIcons();
