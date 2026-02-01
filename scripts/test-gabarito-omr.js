/**
 * Script de teste com OMR (Optical Mark Recognition)
 * Usa Sharp para detectar círculos preenchidos
 * Uso: node scripts/test-gabarito-omr.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Processa imagem de gabarito e detecta marcações
 */
async function processarGabaritoOMR(imagemPath) {
  console.log('🔍 Processando gabarito com OMR...\n');

  // 1. Carregar e processar imagem
  const image = sharp(imagemPath);
  const metadata = await image.metadata();

  console.log(`📊 Imagem original: ${metadata.width}x${metadata.height}`);

  // 2. Converter para escala de cinza e extrair pixels
  const processed = await image
    .resize(2000, null, { // Redimensionar largura para 2000px, manter proporção
      fit: 'inside',
      withoutEnlargement: true
    })
    .grayscale()
    .normalize() // Melhorar contraste
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: pixels, info } = processed;
  console.log(`📊 Imagem processada: ${info.width}x${info.height}\n`);

  // 3. Configurações do gabarito
  const config = {
    totalQuestoes: 90,
    opcoesPorQuestao: 5, // A, B, C, D, E

    // Layout do gabarito (em proporção da imagem)
    margemEsquerda: 0.05, // 5% da largura
    margemTopo: 0.15,     // 15% da altura (pular cabeçalho)

    // Dimensões dos círculos
    raioCirculo: Math.floor(info.width * 0.015), // ~1.5% da largura
    espacamentoHorizontal: info.width * 0.05,     // 5% entre círculos
    espacamentoVertical: info.height * 0.012,     // 1.2% entre linhas

    // Threshold para detectar preenchimento
    thresholdPreenchimento: 100, // Quanto menor, mais escuro precisa estar
  };

  console.log('⚙️  Configurações:');
  console.log(`   Raio do círculo: ${config.raioCirculo}px`);
  console.log(`   Threshold: ${config.thresholdPreenchimento}`);
  console.log(`   Espaçamento horizontal: ${Math.floor(config.espacamentoHorizontal)}px`);
  console.log(`   Espaçamento vertical: ${Math.floor(config.espacamentoVertical)}px\n`);

  // 4. Detectar marcações
  const questoes = [];
  const letras = ['A', 'B', 'C', 'D', 'E'];

  console.log('🔍 Detectando marcações...\n');

  // Processar primeiras 10 questões para teste
  for (let q = 1; q <= 10; q++) {
    // Calcular posição Y da linha da questão
    const linhaIndex = Math.floor((q - 1) / 15); // 15 questões por coluna
    const questaoNaColuna = (q - 1) % 15;

    const colunaIndex = Math.floor((q - 1) / 15);

    const y = Math.floor(
      info.height * config.margemTopo +
      questaoNaColuna * config.espacamentoVertical
    );

    const xBase = Math.floor(
      info.width * config.margemEsquerda +
      colunaIndex * (info.width * 0.25) // 25% da largura por coluna
    );

    // Verificar cada opção (A, B, C, D, E)
    const intensidades = [];

    for (let opcao = 0; opcao < 5; opcao++) {
      const x = Math.floor(xBase + opcao * config.espacamentoHorizontal);

      // Medir intensidade média do círculo
      const intensidade = medirIntensidadeCirculo(
        pixels,
        x,
        y,
        info.width,
        info.height,
        config.raioCirculo
      );

      intensidades.push({ letra: letras[opcao], intensidade, x, y });
    }

    // Ordenar por intensidade (menor = mais escuro = mais preenchido)
    intensidades.sort((a, b) => a.intensidade - b.intensidade);

    // A opção mais escura é a marcada
    const maisEscura = intensidades[0];
    const segundaMaisEscura = intensidades[1];

    // Verificar se há uma diferença significativa
    const diferencaSignificativa = segundaMaisEscura.intensidade - maisEscura.intensidade > 10;

    const respostaMarcada = (maisEscura.intensidade < config.thresholdPreenchimento && diferencaSignificativa)
      ? maisEscura.letra
      : 'N';

    questoes.push({
      numero: q,
      resposta: respostaMarcada,
      intensidades: intensidades.map(i => ({
        letra: i.letra,
        intensidade: Math.floor(i.intensidade)
      }))
    });

    // Log detalhado
    console.log(`Q${q}: ${respostaMarcada} (mais escura: ${maisEscura.letra}=${Math.floor(maisEscura.intensidade)})`);
  }

  console.log('\n✅ Detecção concluída!\n');

  return questoes;
}

/**
 * Mede intensidade média dos pixels em um círculo
 * Retorna valor médio: 0 (preto) a 255 (branco)
 */
function medirIntensidadeCirculo(pixels, centerX, centerY, width, height, raio) {
  let soma = 0;
  let count = 0;

  // Percorrer pixels dentro do círculo
  for (let dy = -raio; dy <= raio; dy++) {
    for (let dx = -raio; dx <= raio; dx++) {
      // Verificar se está dentro do círculo
      if (dx * dx + dy * dy <= raio * raio) {
        const x = centerX + dx;
        const y = centerY + dy;

        // Verificar bounds
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

// ============================================
// TESTE
// ============================================

async function testar() {
  console.log('🧪 Teste: OMR (Optical Mark Recognition)\n');
  console.log('━'.repeat(80));
  console.log();

  try {
    const gabaritoPath = path.join(__dirname, '../simulado/gabarito_usuario.jpg');

    console.log(`📁 Arquivo: ${path.basename(gabaritoPath)}`);
    console.log(`📊 Tamanho: ${(fs.statSync(gabaritoPath).size / 1024).toFixed(2)} KB\n`);
    console.log('━'.repeat(80));
    console.log();

    const start = Date.now();
    const questoes = await processarGabaritoOMR(gabaritoPath);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log('━'.repeat(80));
    console.log(`⏱️  Tempo de processamento: ${elapsed}s\n`);

    // Comparar com gabarito real
    const gabaritoReal = {
      1: 'A', 2: 'B', 3: 'A', 4: 'E', 5: 'C',
      6: 'A', 7: 'B', 8: 'A', 9: 'C', 10: 'C'
    };

    console.log('🎯 COMPARAÇÃO COM GABARITO REAL:');
    console.log('─'.repeat(80));

    let acertos = 0;
    questoes.forEach(q => {
      const esperado = gabaritoReal[q.numero];
      const acertou = q.resposta === esperado;
      if (acertou) acertos++;

      const status = acertou ? '✅' : '❌';
      console.log(`   ${status} Q${q.numero}: OMR=${q.resposta} | REAL=${esperado}`);

      // Mostrar intensidades para debug
      const intensidadesStr = q.intensidades
        .map(i => `${i.letra}:${i.intensidade}`)
        .join(', ');
      console.log(`      Intensidades: ${intensidadesStr}`);
    });

    console.log('─'.repeat(80));
    console.log(`\n📊 TAXA DE ACERTO: ${acertos}/10 (${(acertos/10*100).toFixed(1)}%)\n`);

    console.log('🎉 Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testar();
