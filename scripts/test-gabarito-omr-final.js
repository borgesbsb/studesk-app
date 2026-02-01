/**
 * Script OMR FINAL - Coordenadas calibradas e algoritmo refinado
 * Uso: node scripts/test-gabarito-omr-final.js
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

async function extrairGabaritoOMR(imagePath, questaoInicio, questaoFim) {
  console.log(`🔍 Extraindo gabarito (questões ${questaoInicio}-${questaoFim})...\n`);

  // Processar imagem SEM normalizar (pois azul some com normalize)
  // Estratégia: aumentar saturação antes de converter para cinza
  const processed = await sharp(imagePath)
    .modulate({
      saturation: 0.3 // Reduzir saturação faz o azul ficar mais escuro em grayscale
    })
    .grayscale()
    .linear(1.5, -50) // Aumentar contraste manualmente: a*x + b
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: pixels, info } = processed;
  const { width, height } = info;

  console.log(`📊 Imagem: ${width}x${height}px\n`);

  // Coordenadas calibradas
  const config = {
    xOpcoes: [46, 66, 86, 106, 126], // A, B, C, D, E
    yInicio: 171,
    yEspacamento: 27,
    raio: 10 // Aumentado para capturar melhor a marcação
  };

  const letras = ['A', 'B', 'C', 'D', 'E'];
  const questoes = [];

  for (let q = questaoInicio; q <= questaoFim; q++) {
    const y = config.yInicio + ((q - 1) * config.yEspacamento);

    const intensidades = [];

    for (let i = 0; i < 5; i++) {
      const x = config.xOpcoes[i];
      const intensidade = medirIntensidadeCirculo(
        pixels,
        x,
        y,
        width,
        height,
        config.raio
      );

      intensidades.push({
        letra: letras[i],
        intensidade
      });
    }

    // Ordenar por intensidade (menor = mais escuro = marcado)
    intensidades.sort((a, b) => a.intensidade - b.intensidade);

    const maisEscura = intensidades[0];
    const segundaMaisEscura = intensidades[1];
    const diferenca = segundaMaisEscura.intensidade - maisEscura.intensidade;

    // Algoritmo refinado de detecção:
    // Baseado nas intensidades medidas, as marcações azuis ficam entre 120-200
    // O importante é a DIFERENÇA relativa, não o valor absoluto
    // Se a diferença for > 3 e a mais escura < 205, provavelmente está marcada
    const respostaMarcada = (diferenca >= 3 && maisEscura.intensidade < 205)
      ? maisEscura.letra
      : 'N';

    questoes.push({
      numero: q,
      resposta: respostaMarcada,
      debug: {
        intensidades: intensidades.map(i => ({
          letra: i.letra,
          int: Math.floor(i.intensidade)
        })),
        maisEscura: Math.floor(maisEscura.intensidade),
        diferenca: Math.floor(diferenca)
      }
    });

    const intStr = intensidades
      .map(i => `${i.letra}:${Math.floor(i.intensidade)}`)
      .join(' ');

    console.log(`Q${q}: ${respostaMarcada.padEnd(2)} | ${intStr} | Diff=${Math.floor(diferenca)}`);
  }

  return questoes;
}

async function testar() {
  console.log('🧪 Teste: OMR FINAL\n');
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

    // Gabarito real fornecido pelo usuário
    const gabaritoReal = {
      1: 'A', 2: 'B', 3: 'A', 4: 'E', 5: 'C',
      6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C'
    };

    console.log('🎯 COMPARAÇÃO COM GABARITO REAL:');
    console.log('─'.repeat(80));

    let acertos = 0;
    let erros = 0;
    let naoRespondidas = 0;

    questoes.forEach(q => {
      const esperado = gabaritoReal[q.numero];
      const obtido = q.resposta;

      let status;
      if (obtido === 'N') {
        status = '⚪';
        naoRespondidas++;
      } else if (obtido === esperado) {
        status = '✅';
        acertos++;
      } else {
        status = '❌';
        erros++;
      }

      console.log(`${status} Q${q.numero}: OMR=${obtido} | REAL=${esperado} | MaisEscura=${q.debug.maisEscura} | Diff=${q.debug.diferenca}`);
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 RESULTADO:`);
    console.log(`   ✅ Acertos: ${acertos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   ⚪ Não detectadas: ${naoRespondidas}`);
    console.log(`   📈 Precisão: ${acertos}/10 (${(acertos/10*100).toFixed(1)}%)\n`);

    if (acertos >= 9) {
      console.log('🎉🎉🎉 EXCELENTE! OMR pronto para produção!');
    } else if (acertos >= 7) {
      console.log('✅ BOM! OMR funcional, aceitável para produção.');
    } else if (acertos >= 5) {
      console.log('⚠️  RAZOÁVEL. Pode funcionar mas precisa melhorias.');
    } else {
      console.log('❌ INSUFICIENTE. Precisa mais ajustes.');
    }

    console.log('\n💡 ANÁLISE:');
    if (naoRespondidas > 0) {
      console.log('   - Algumas marcações não foram detectadas');
      console.log('   - Possível causa: marcação muito fraca ou threshold muito restritivo');
    }
    if (erros > 0) {
      console.log('   - Algumas detecções incorretas');
      console.log('   - Verificar se coordenadas estão alinhadas corretamente');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testar();
