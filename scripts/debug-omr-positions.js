/**
 * Script para DEBUG: Desenha círculos nas posições onde o OMR está procurando
 * Para calibrar as coordenadas corretas
 * Uso: node scripts/debug-omr-positions.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function desenharPosicoesOMR() {
  console.log('🎨 Desenhando posições de detecção...\n');

  const inputPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
  const outputPath = path.join(__dirname, '../simulado/gabarito_debug_positions.png');

  // Carregar imagem
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  console.log(`📊 Imagem: ${metadata.width}x${metadata.height}px\n`);

  // Configuração das colunas (baseada no OMR v2)
  const width = metadata.width;
  const height = metadata.height;

  const colunas = [
    { // Coluna 1: Questões 1-15
      xOpcoes: [
        width * 0.098,  // A
        width * 0.120,  // B
        width * 0.142,  // C
        width * 0.164,  // D
        width * 0.186   // E
      ],
      yInicio: height * 0.138,
      yEspacamento: height * 0.0215,
      questoes: 15,
      offset: 0
    }
  ];

  // Criar SVG com círculos
  const raio = width * 0.010;
  let svgCircles = '';
  const letras = ['A', 'B', 'C', 'D', 'E'];
  const cores = ['red', 'blue', 'green', 'orange', 'purple'];

  console.log('Gerando marcadores para questões 1-10:\n');

  // Desenhar apenas questões 1-10
  for (let q = 1; q <= 10; q++) {
    const coluna = colunas[0];
    const questaoNaColuna = q - 1;
    const y = coluna.yInicio + (questaoNaColuna * coluna.yEspacamento);

    for (let i = 0; i < 5; i++) {
      const x = coluna.xOpcoes[i];
      const cor = cores[i];

      // Círculo vazado
      svgCircles += `<circle cx="${x}" cy="${y}" r="${raio}" fill="none" stroke="${cor}" stroke-width="2" opacity="0.7"/>`;

      // Texto com a letra
      svgCircles += `<text x="${x}" y="${y - raio - 5}" fill="${cor}" font-size="12" text-anchor="middle" font-weight="bold">${letras[i]}</text>`;
    }

    // Número da questão
    svgCircles += `<text x="${coluna.xOpcoes[0] - 30}" y="${y + 5}" fill="white" font-size="14" font-weight="bold" stroke="black" stroke-width="0.5">Q${q}</text>`;

    console.log(`Q${q}: Y=${Math.floor(y)}`);
  }

  // Criar SVG overlay
  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}">
      ${svgCircles}
    </svg>
  `);

  // Compor imagem original com overlay
  await image
    .composite([{
      input: svgOverlay,
      blend: 'over'
    }])
    .toFile(outputPath);

  console.log(`\n✅ Imagem debug salva em:`);
  console.log(`   ${outputPath}\n`);
  console.log('📝 Verifique se os círculos estão alinhados com as bolinhas do gabarito!');
  console.log('   - Vermelho = A');
  console.log('   - Azul = B');
  console.log('   - Verde = C');
  console.log('   - Laranja = D');
  console.log('   - Roxo = E\n');
}

desenharPosicoesOMR().catch(console.error);
