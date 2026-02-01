/**
 * Script OMR usando CANAL AZUL
 * Para detectar marcações feitas com caneta azul
 * Uso: node scripts/test-gabarito-omr-blue-channel.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function medirIntensidadeCirculo(pixels, centerX, centerY, width, height, raio, channels) {
  let soma = 0;
  let count = 0;

  for (let dy = -raio; dy <= raio; dy++) {
    for (let dx = -raio; dx <= raio; dx++) {
      if (dx * dx + dy * dy <= raio * raio) {
        const x = Math.floor(centerX + dx);
        const y = Math.floor(centerY + dy);

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * channels; // RGB tem 3 canais
          if (index >= 0 && index < pixels.length) {
            // Calcular "blueness" = canal azul MENOS média de vermelho+verde
            // Onde há azul forte, blueness é alto
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];

            // Círculo preenchido com azul: b alto, r e g baixos
            // Quanto MAIOR o blueness, mais azul tem
            const blueness = b - (r + g) / 2;

            soma += blueness;
            count++;
          }
        }
      }
    }
  }

  return count > 0 ? soma / count : 0;
}

async function extrairGabaritoOMR(imagePath, questaoInicio, questaoFim) {
  console.log(`🔍 Extraindo gabarito usando canal AZUL...\n`);

  // Processar imagem RGB (SEM converter para grayscale!)
  const processed = await sharp(imagePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: pixels, info } = processed;
  const { width, height, channels } = info;

  console.log(`📊 Imagem: ${width}x${height}px (${channels} canais)\n`);

  // Coordenadas calibradas
  const config = {
    xOpcoes: [46, 66, 86, 106, 126], // A, B, C, D, E
    yInicio: 171,
    yEspacamento: 27,
    raio: 10
  };

  const letras = ['A', 'B', 'C', 'D', 'E'];
  const questoes = [];

  for (let q = questaoInicio; q <= questaoFim; q++) {
    const y = config.yInicio + ((q - 1) * config.yEspacamento);

    const medicoes = [];

    for (let i = 0; i < 5; i++) {
      const x = config.xOpcoes[i];
      const blueness = medirIntensidadeCirculo(
        pixels,
        x,
        y,
        width,
        height,
        config.raio,
        channels
      );

      medicoes.push({
        letra: letras[i],
        blueness
      });
    }

    // Ordenar por blueness (MAIOR = mais azul = marcado)
    medicoes.sort((a, b) => b.blueness - a.blueness);

    const maisAzul = medicoes[0];
    const segundaMaisAzul = medicoes[1];
    const diferenca = maisAzul.blueness - segundaMaisAzul.blueness;

    // Se a opção mais azul tem blueness > 10 e diferença > 3, está marcada
    const respostaMarcada = (maisAzul.blueness > 10 && diferenca > 3)
      ? maisAzul.letra
      : 'N';

    questoes.push({
      numero: q,
      resposta: respostaMarcada,
      debug: {
        medicoes: medicoes.map(m => ({
          letra: m.letra,
          blue: Math.floor(m.blueness)
        })),
        maisAzul: Math.floor(maisAzul.blueness),
        diferenca: Math.floor(diferenca)
      }
    });

    const medStr = medicoes
      .map(m => `${m.letra}:${Math.floor(m.blueness)}`)
      .join(' ');

    console.log(`Q${q}: ${respostaMarcada.padEnd(2)} | ${medStr} | Diff=${Math.floor(diferenca)}`);
  }

  return questoes;
}

async function testar() {
  console.log('🧪 Teste: OMR com Canal AZUL\n');
  console.log('━'.repeat(80));
  console.log();

  try {
    const gabaritoPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');
    console.log(`📁 Arquivo: ${path.basename(gabaritoPath)}\n`);

    const start = Date.now();
    const questoes = await extrairGabaritoOMR(gabaritoPath, 1, 10);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log('\n━'.repeat(80));
    console.log(`⏱️  Tempo: ${elapsed}s\n`);

    const gabaritoReal = {
      1: 'A', 2: 'B', 3: 'A', 4: 'E', 5: 'C',
      6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C'
    };

    console.log('🎯 COMPARAÇÃO:');
    console.log('─'.repeat(80));

    let acertos = 0;
    let erros = 0;
    let naoDetectadas = 0;

    questoes.forEach(q => {
      const esperado = gabaritoReal[q.numero];
      const obtido = q.resposta;

      let status;
      if (obtido === 'N') {
        status = '⚪';
        naoDetectadas++;
      } else if (obtido === esperado) {
        status = '✅';
        acertos++;
      } else {
        status = '❌';
        erros++;
      }

      console.log(`${status} Q${q.numero}: OMR=${obtido} | REAL=${esperado} | MaisAzul=${q.debug.maisAzul} | Diff=${q.debug.diferenca}`);
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 RESULTADO:`);
    console.log(`   ✅ Acertos: ${acertos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   ⚪ Não detectadas: ${naoDetectadas}`);
    const precisao = acertos + erros > 0 ? (acertos / (acertos + erros) * 100).toFixed(1) : 0;
    console.log(`   📈 Precisão: ${acertos}/${acertos + erros} (${precisao}%)\n`);

    if (acertos >= 9) {
      console.log('🎉🎉🎉 EXCELENTE! OMR pronto para produção!');
    } else if (acertos >= 7) {
      console.log('✅ BOM! OMR funcional.');
    } else if (acertos >= 5) {
      console.log('⚠️  RAZOÁVEL. Pode funcionar.');
    } else {
      console.log('❌ INSUFICIENTE.');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testar();
