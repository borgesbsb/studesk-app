const fs = require('fs');
const path = require('path');

// Função para criar um SVG simples com o logo
function createIconSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0f172a" rx="${size * 0.2}"/>

  <!-- Book Icon -->
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <path d="M ${size * 0.125} ${size * 0.08} V ${size * 0.42} M ${size * 0.125} ${size * 0.08} C ${size * 0.11} ${size * 0.06} ${size * 0.09} ${size * 0.05} ${size * 0.075} ${size * 0.05} C ${size * 0.06} ${size * 0.05} ${size * 0.04} ${size * 0.06} ${size * 0.03} ${size * 0.08} V ${size * 0.42} C ${size * 0.04} ${size * 0.4} ${size * 0.06} ${size * 0.39} ${size * 0.075} ${size * 0.39} C ${size * 0.09} ${size * 0.39} ${size * 0.11} ${size * 0.4} ${size * 0.125} ${size * 0.42} M ${size * 0.125} ${size * 0.08} C ${size * 0.14} ${size * 0.06} ${size * 0.16} ${size * 0.05} ${size * 0.175} ${size * 0.05} C ${size * 0.19} ${size * 0.05} ${size * 0.21} ${size * 0.06} ${size * 0.22} ${size * 0.08} V ${size * 0.42} C ${size * 0.21} ${size * 0.4} ${size * 0.19} ${size * 0.39} ${size * 0.175} ${size * 0.39} C ${size * 0.16} ${size * 0.39} ${size * 0.14} ${size * 0.4} ${size * 0.125} ${size * 0.42}"
          stroke="white"
          stroke-width="${size * 0.015}"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"/>
  </g>

  <!-- Text -->
  <text x="50%" y="${size * 0.75}"
        font-family="Arial, sans-serif"
        font-size="${size * 0.12}"
        font-weight="bold"
        fill="white"
        text-anchor="middle">
    Studesk
  </text>
</svg>`;
}

// Criar diretório public se não existir
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Gerar ícones SVG
const icon192 = createIconSVG(192);
const icon512 = createIconSVG(512);

// Salvar SVGs temporários (podem ser convertidos para PNG depois)
fs.writeFileSync(path.join(publicDir, 'icon-192x192.svg'), icon192);
fs.writeFileSync(path.join(publicDir, 'icon-512x512.svg'), icon512);

console.log('✅ Ícones SVG criados com sucesso!');
console.log('📝 Para converter para PNG, use um conversor online ou instale sharp/imagemagick');
