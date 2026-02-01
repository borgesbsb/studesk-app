/**
 * Script de CALIBRAÇÃO OMR
 * Testa diferentes configurações e gera imagem visual
 * Uso: node scripts/calibrar-omr.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function calibrarOMR() {
  console.log('🎯 CALIBRAÇÃO OMR\n');

  const inputPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
  const outputPath = path.join(__dirname, '../simulado/gabarito_calibracao.png');

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  console.log(`📊 Imagem: ${width}x${height}px\n`);

  // TESTANDO DIFERENTES CONFIGURAÇÕES
  // Analisando a imagem visualmente, os círculos parecem estar em:

  const configs = [
    {
      nome: 'Config 1 - Baseado na visualização',
      xOpcoes: [
        46,  // A
        66,  // B
        86,  // C
        106, // D
        126  // E
      ],
      yInicio: 171,
      yEspacamento: 27,
      raio: 8
    }
  ];

  for (const config of configs) {
    console.log(`\n📝 Testando: ${config.nome}`);
    console.log(`   X das opções: ${config.xOpcoes.join(', ')}`);
    console.log(`   Y inicial: ${config.yInicio}`);
    console.log(`   Espaçamento Y: ${config.yEspacamento}`);
    console.log(`   Raio: ${config.raio}`);

    // Criar SVG com marcadores
    let svgCircles = '';
    const letras = ['A', 'B', 'C', 'D', 'E'];
    const cores = ['#FF0000', '#0000FF', '#00FF00', '#FF9900', '#9900FF'];

    for (let q = 1; q <= 10; q++) {
      const y = config.yInicio + ((q - 1) * config.yEspacamento);

      for (let i = 0; i < 5; i++) {
        const x = config.xOpcoes[i];
        const cor = cores[i];

        // Círculo vazado
        svgCircles += `<circle cx="${x}" cy="${y}" r="${config.raio}" fill="none" stroke="${cor}" stroke-width="1.5" opacity="0.8"/>`;

        // Ponto central
        svgCircles += `<circle cx="${x}" cy="${y}" r="1" fill="${cor}"/>`;
      }

      // Número da questão
      svgCircles += `<text x="${config.xOpcoes[0] - 20}" y="${y + 4}" fill="yellow" font-size="12" font-weight="bold" stroke="black" stroke-width="0.5">Q${q}</text>`;
    }

    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}">
        ${svgCircles}
        <text x="10" y="30" fill="white" font-size="14" font-weight="bold" stroke="black" stroke-width="0.5">${config.nome}</text>
      </svg>
    `);

    await sharp(inputPath)
      .composite([{ input: svgOverlay, blend: 'over' }])
      .toFile(outputPath);

    console.log(`\n   ✅ Imagem salva em: ${outputPath}`);
    console.log(`   📍 Verifique se os círculos estão alinhados!\n`);
  }

  // MEDIR INTENSIDADES nas posições da primeira config
  console.log('━'.repeat(80));
  console.log('\n📊 Medindo intensidades na Config 1:\n');

  const processed = await sharp(inputPath)
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: pixels } = processed;
  const config = configs[0];
  const letras = ['A', 'B', 'C', 'D', 'E'];

  // Gabarito real
  const gabaritoReal = {
    1: 'A', 2: 'B', 3: 'A', 4: 'E', 5: 'C',
    6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C'
  };

  for (let q = 1; q <= 10; q++) {
    const y = config.yInicio + ((q - 1) * config.yEspacamento);

    const intensidades = [];

    for (let i = 0; i < 5; i++) {
      const x = config.xOpcoes[i];
      const intensidade = medirIntensidade(pixels, x, y, width, height, config.raio);
      intensidades.push({ letra: letras[i], int: Math.floor(intensidade) });
    }

    const intStr = intensidades.map(i => `${i.letra}:${i.int}`).join(' ');
    const esperado = gabaritoReal[q];
    const maisEscura = intensidades.reduce((prev, curr) => prev.int < curr.int ? prev : curr);

    console.log(`Q${q} (esperado: ${esperado}, mais escuro: ${maisEscura.letra}): ${intStr}`);
  }

  console.log('\n━'.repeat(80));
  console.log('\n💡 Próximos passos:');
  console.log('   1. Abra a imagem de calibração');
  console.log('   2. Verifique se os círculos coloridos estão alinhados');
  console.log('   3. Ajuste os valores no código se necessário');
  console.log('   4. Execute novamente até alinhar perfeitamente\n');
}

function medirIntensidade(pixels, centerX, centerY, width, height, raio) {
  let soma = 0;
  let count = 0;

  for (let dy = -raio; dy <= raio; dy++) {
    for (let dx = -raio; dx <= raio; dx++) {
      if (dx * dx + dy * dy <= raio * raio) {
        const x = Math.floor(centerX + dx);
        const y = Math.floor(centerY + dy);

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = y * width + x;
          if (index >= 0 && index < pixels.length) {
            soma += pixels[index];
            count++;
          }
        }
      }
    }
  }

  return count > 0 ? soma / count : 255;
}

calibrarOMR().catch(console.error);
