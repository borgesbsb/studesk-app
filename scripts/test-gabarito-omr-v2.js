/**
 * Script de teste OMR v2 - Com calibração manual baseada na imagem real
 * Uso: node scripts/test-gabarito-omr-v2.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Mede intensidade média dos pixels em um círculo
 */
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

/**
 * Detecta layout da folha de gabarito automaticamente
 */
async function detectarLayoutGabarito(imagePath) {
  console.log('🔍 Analisando layout do gabarito...\n');

  // Processar imagem
  const processed = await sharp(imagePath)
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: pixels, info } = processed;

  console.log(`📊 Imagem: ${info.width}x${info.height}px\n`);

  // CALIBRAÇÃO MANUAL baseada na imagem real vista
  // A imagem tem 4 colunas de questões (1-15, 16-30, 31-45, 46-60)
  // Depois continua embaixo (61-75, 76-90)

  const layout = {
    // Posições aproximadas baseadas na visualização da imagem
    colunas: [
      { // Coluna 1: Questões 1-15
        xInicio: info.width * 0.065,
        xOpcoes: [
          info.width * 0.098,  // A
          info.width * 0.120,  // B
          info.width * 0.142,  // C
          info.width * 0.164,  // D
          info.width * 0.186   // E
        ],
        yInicio: info.height * 0.138,
        yEspacamento: info.height * 0.0215,
        questoes: 15
      },
      { // Coluna 2: Questões 16-30
        xInicio: info.width * 0.315,
        xOpcoes: [
          info.width * 0.348,
          info.width * 0.370,
          info.width * 0.392,
          info.width * 0.414,
          info.width * 0.436
        ],
        yInicio: info.height * 0.138,
        yEspacamento: info.height * 0.0215,
        questoes: 15
      },
      { // Coluna 3: Questões 31-45
        xInicio: info.width * 0.565,
        xOpcoes: [
          info.width * 0.598,
          info.width * 0.620,
          info.width * 0.642,
          info.width * 0.664,
          info.width * 0.686
        ],
        yInicio: info.height * 0.138,
        yEspacamento: info.height * 0.0215,
        questoes: 15
      },
      { // Coluna 4: Questões 46-60
        xInicio: info.width * 0.815,
        xOpcoes: [
          info.width * 0.848,
          info.width * 0.870,
          info.width * 0.892,
          info.width * 0.914,
          info.width * 0.936
        ],
        yInicio: info.height * 0.138,
        yEspacamento: info.height * 0.0215,
        questoes: 15
      }
    ],
    raioCirculo: Math.floor(info.width * 0.010),
    width: info.width,
    height: info.height,
    pixels
  };

  console.log(`⚙️  Raio do círculo: ${layout.raioCirculo}px\n`);

  return layout;
}

/**
 * Extrai respostas usando o layout detectado
 */
function extrairRespostas(layout, questaoInicio, questaoFim) {
  const letras = ['A', 'B', 'C', 'D', 'E'];
  const questoes = [];

  console.log('🔍 Extraindo respostas...\n');

  for (let q = questaoInicio; q <= questaoFim; q++) {
    // Determinar em qual coluna a questão está
    let coluna, questaoNaColuna;

    if (q <= 15) {
      coluna = layout.colunas[0];
      questaoNaColuna = q - 1;
    } else if (q <= 30) {
      coluna = layout.colunas[1];
      questaoNaColuna = q - 16;
    } else if (q <= 45) {
      coluna = layout.colunas[2];
      questaoNaColuna = q - 31;
    } else if (q <= 60) {
      coluna = layout.colunas[3];
      questaoNaColuna = q - 46;
    } else {
      // Questões 61-90 ficam embaixo (não implementado ainda)
      continue;
    }

    // Calcular Y da linha
    const y = coluna.yInicio + (questaoNaColuna * coluna.yEspacamento);

    // Medir intensidade de cada opção
    const intensidades = [];

    for (let i = 0; i < 5; i++) {
      const x = coluna.xOpcoes[i];

      const intensidade = medirIntensidadeCirculo(
        layout.pixels,
        x,
        y,
        layout.width,
        layout.height,
        layout.raioCirculo
      );

      intensidades.push({
        letra: letras[i],
        intensidade,
        x: Math.floor(x),
        y: Math.floor(y)
      });
    }

    // Ordenar por intensidade (menor = mais escuro)
    intensidades.sort((a, b) => a.intensidade - b.intensidade);

    const maisEscura = intensidades[0];
    const segundaMaisEscura = intensidades[1];

    // Diferença significativa indica que há uma marcação clara
    const diferencaSignificativa = segundaMaisEscura.intensidade - maisEscura.intensidade > 15;

    // Threshold: círculo preenchido deve estar bem escuro
    const respostaMarcada = (maisEscura.intensidade < 180 && diferencaSignificativa)
      ? maisEscura.letra
      : 'N';

    questoes.push({
      numero: q,
      resposta: respostaMarcada,
      intensidades: intensidades.map(i => ({
        letra: i.letra,
        intensidade: Math.floor(i.intensidade)
      })),
      debug: {
        y: Math.floor(y),
        maisEscura: Math.floor(maisEscura.intensidade),
        diferenca: Math.floor(segundaMaisEscura.intensidade - maisEscura.intensidade)
      }
    });

    console.log(`Q${q}: ${respostaMarcada} | Mais escura: ${maisEscura.letra}=${Math.floor(maisEscura.intensidade)} | Diff: ${Math.floor(segundaMaisEscura.intensidade - maisEscura.intensidade)}`);
  }

  return questoes;
}

// ============================================
// TESTE
// ============================================

async function testar() {
  console.log('🧪 Teste: OMR v2 (com calibração manual)\n');
  console.log('━'.repeat(80));
  console.log();

  try {
    const gabaritoPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');

    console.log(`📁 Arquivo: ${path.basename(gabaritoPath)}\n`);

    const start = Date.now();

    // 1. Detectar layout
    const layout = await detectarLayoutGabarito(gabaritoPath);

    // 2. Extrair respostas (questões 1-10)
    const questoes = extrairRespostas(layout, 1, 10);

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log('\n━'.repeat(80));
    console.log(`⏱️  Tempo: ${elapsed}s\n`);

    // 3. Comparar com gabarito real
    const gabaritoReal = {
      1: 'A', 2: 'B', 3: 'A', 4: 'E', 5: 'C',
      6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C'
    };

    console.log('🎯 COMPARAÇÃO:');
    console.log('─'.repeat(80));

    let acertos = 0;
    questoes.forEach(q => {
      const esperado = gabaritoReal[q.numero];
      const acertou = q.resposta === esperado;
      if (acertou) acertos++;

      const status = acertou ? '✅' : '❌';
      console.log(`${status} Q${q.numero}: OMR=${q.resposta} | REAL=${esperado}`);

      // Debug: mostrar intensidades
      const intStr = q.intensidades.slice(0, 5).map(i => `${i.letra}:${i.intensidade}`).join(' ');
      console.log(`   Intensidades: ${intStr}`);
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 PRECISÃO: ${acertos}/10 (${(acertos/10*100).toFixed(1)}%)\n`);

    if (acertos >= 8) {
      console.log('🎉 Excelente! OMR funcionando bem!');
    } else if (acertos >= 5) {
      console.log('⚠️  OMR parcialmente funcional. Necessita ajuste fino.');
    } else {
      console.log('❌ OMR precisa de calibração. Ajustar coordenadas.');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testar();
