const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function calcularCustoTTS() {
  try {
    // Buscar todos os materiais com texto formatado
    const materiais = await prisma.materialEstudo.findMany({
      select: {
        id: true,
        nome: true,
        mobileText: {
          select: {
            formattedText: true,
            rawText: true
          }
        }
      }
    })

    console.log('📊 ANÁLISE DE CUSTO TTS - OpenAI\n')
    console.log('='.repeat(60))

    let totalCaracteres = 0
    let totalMateriais = 0
    let materiaisComTexto = 0

    for (const material of materiais) {
      const mobileText = material.mobileText
      const textoCompleto = mobileText?.formattedText || ''

      const numCaracteres = textoCompleto.length

      if (numCaracteres > 0) {
        materiaisComTexto++
        totalCaracteres += numCaracteres

        console.log(`\n📄 ${material.nome}`)
        console.log(`   Caracteres: ${numCaracteres.toLocaleString('pt-BR')}`)

        // Calcular custo para este material
        const custoTTS1 = (numCaracteres / 1_000_000) * 15 // $15 por 1M caracteres
        const custoTTS1HD = (numCaracteres / 1_000_000) * 30 // $30 por 1M caracteres

        console.log(`   Custo TTS-1: $${custoTTS1.toFixed(4)}`)
        console.log(`   Custo TTS-1-HD: $${custoTTS1HD.toFixed(4)}`)
      }

      totalMateriais++
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n📈 RESUMO GERAL:\n')
    console.log(`Total de materiais: ${totalMateriais}`)
    console.log(`Materiais com texto: ${materiaisComTexto}`)
    console.log(`Total de caracteres: ${totalCaracteres.toLocaleString('pt-BR')}`)

    // Custos totais
    const custoTotalTTS1 = (totalCaracteres / 1_000_000) * 15
    const custoTotalTTS1HD = (totalCaracteres / 1_000_000) * 30

    console.log(`\n💰 CUSTO TOTAL ESTIMADO:`)
    console.log(`   TTS-1 (rápido): $${custoTotalTTS1.toFixed(2)} USD`)
    console.log(`   TTS-1-HD (alta qualidade): $${custoTotalTTS1HD.toFixed(2)} USD`)

    // Custo por leitura completa
    console.log(`\n💡 CENÁRIOS DE USO:`)
    console.log(`\n   Se você ouvir TODO o conteúdo UMA vez:`)
    console.log(`   - TTS-1: $${custoTotalTTS1.toFixed(2)}`)
    console.log(`   - TTS-1-HD: $${custoTotalTTS1HD.toFixed(2)}`)

    // Estimativa de tempo de áudio
    // Assumindo ~150 palavras por minuto de fala
    // ~5 caracteres por palavra em português
    const palavrasEstimadas = totalCaracteres / 5
    const minutosEstimados = palavrasEstimadas / 150
    const horasEstimadas = minutosEstimados / 60

    console.log(`\n⏱️  TEMPO ESTIMADO DE ÁUDIO:`)
    console.log(`   ~${Math.round(minutosEstimados)} minutos (~${horasEstimadas.toFixed(1)} horas)`)

    // Comparação com outras opções
    console.log(`\n📊 COMPARAÇÃO COM ALTERNATIVAS:`)
    console.log(`   Web Speech API (nativo): $0.00 (GRÁTIS)`)
    console.log(`   OpenAI TTS-1: $${custoTotalTTS1.toFixed(2)}`)
    console.log(`   OpenAI TTS-1-HD: $${custoTotalTTS1HD.toFixed(2)}`)
    console.log(`   Google Cloud Neural2: $${((totalCaracteres / 1_000_000) * 16).toFixed(2)}`)
    console.log(`   ElevenLabs (Starter $5/mês): ${totalCaracteres > 30_000 ? 'Insuficiente' : 'Suficiente'}`)

    // Estratégias de otimização
    console.log(`\n💡 ESTRATÉGIAS DE OTIMIZAÇÃO:`)
    console.log(`   1. Cache de áudio: Gerar uma vez, reusar sempre`)
    console.log(`   2. TTS sob demanda: Gerar apenas trechos sendo lidos`)
    console.log(`   3. Usar TTS-1 (50% mais barato que HD)`)
    console.log(`   4. Web Speech API como fallback gratuito`)

    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

calcularCustoTTS()
