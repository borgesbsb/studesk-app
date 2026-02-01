/**
 * Script OMR v3 - Coordenadas calibradas manualmente após análise visual
 * Uso: node scripts/test-gabarito-omr-v3.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function medirIntensidadeCirculo(pixels, centerX, centerY, width, height, raio) {
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

async function processarGabaritoOMR(imagePath) {
  console.log('🔍 Processando gabarito com OMR v3...\n');

  const processed = await sharp(imagePath)
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: pixels, info } = processed;
  const { width, height } = info;

  console.log(`📊 Imagem: ${width}x${height}px\n`);

  // COORDENADAS CALIBRADAS MANUALMENTE
  // Baseadas na visualização da imagem debug
  const layout = {
    coluna1: { // Questões 1-15
      xOpcoes: [
        width * 0.0479,  // A - ajustado
        width * 0.0688,  // B
        width * 0.0895,  // C
        width * 0.1104,  // D
        width * 0.1313   // E
      ],
      yInicio: height * 0.1336,
      yEspacamento: height * 0.02109
    }
  };

  const raio = Math.floor(width * 0.008); // Raio menor
  console.log(`⚙️  Raio: ${raio}px\n`);

  const letras = ['A', 'B', 'C', 'D', 'E'];
  const questoes = [];

  console.log('🔍 Extraindo respostas...\n');

  for (let q = 1; q <= 10; q++) {
    const questaoNaColuna = q - 1;
    const y = layout.coluna1.yInicio + (questaoNaColuna * layout.coluna1.yEspacamento);

    const intensidades = [];

    for (let i = 0; i < 5; i++) {
      const x = layout.coluna1.xOpcoes[i];

      const intensidade = medirIntensidadeCirculo(
        pixels,
        x,
        y,
        width,
        height,
        raio
      );

      intensidades.push({
        letra: letras[i],
        intensidade
      });
    }

    // Ordenar por intensidade (menor = mais escuro)
    intensidades.sort((a, b) => a.intensidade - b.intensidade);

    const maisEscura = intensidades[0];
    const segundaMaisEscura = intensidades[1];
    const diferenca = segundaMaisEscura.intensidade - maisEscura.intensidade;

    // Ajustar threshold baseado na intensidade absoluta
    const respostaMarcada = (maisEscura.intensidade < 150 && diferenca > 20)
      ? maisEscura.letra
      : 'N';

    questoes.push({
      numero: q,
      resposta: respostaMarcada,
      debug: {
        maisEscura: `${maisEscura.letra}=${Math.floor(maisEscura.intensidade)}`,
        diferenca: Math.floor(diferenca)
      }
    });

    console.log(`Q${q}: ${respostaMarcada} | ${maisEscura.letra}=${Math.floor(maisEscura.intensidade)} | Diff=${Math.floor(diferenca)}`);
  }

  return questoes;
}

async function testar() {
  console.log('🧪 Teste: OMR v3 (calibração manual final)\n');
  console.log('━'.repeat(80));
  console.log();

  try {
    const gabaritoPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');

    const start = Date.now();
    const questoes = await processarGabaritoOMR(gabaritoPath);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log('\n━'.repeat(80));
    console.log(`⏱️  Tempo: ${elapsed}s\n`);

    const gabaritoReal = {
      1: 'A', 2: 'B', 3: 'A', 4: 'E', 5: 'C',
      6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C'
    };

    console.log('🎯 RESULTADO:');
    console.log('─'.repeat(80));

    let acertos = 0;
    questoes.forEach(q => {
      const esperado = gabaritoReal[q.numero];
      const acertou = q.resposta === esperado;
      if (acertou) acertos++;

      const status = acertou ? '✅' : '❌';
      console.log(`${status} Q${q.numero}: OMR=${q.resposta} | REAL=${esperado} | ${q.debug.maisEscura} | Diff=${q.debug.diferenca}`);
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 PRECISÃO: ${acertos}/10 (${(acertos/10*100).toFixed(1)}%)\n`);

    if (acertos >= 9) {
      console.log('🎉🎉🎉 EXCELENTE! OMR funcionando perfeitamente!');
    } else if (acertos >= 7) {
      console.log('✅ Bom! OMR funcional, pode precisar ajuste fino.');
    } else {
      console.log('⚠️  Precisa mais calibração.');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testar();
