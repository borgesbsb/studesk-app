import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Remove quebras de linha simples dentro de parágrafos, mantendo apenas quebras duplas
 */
function fixParagraphBreaks(text: string): string {
  // 1. Preservar marcadores de página adicionando marcador especial
  let fixed = text.replace(/\[PAGE_(\d+)\]/g, '<<<PAGE_MARKER_$1>>>')

  // 2. Preservar títulos markdown (linhas que começam com #)
  fixed = fixed.replace(/^(#{1,6}\s+.+)$/gm, '<<<HEADING>>>$1<<<HEADING_END>>>')

  // 3. Preservar listas (linhas que começam com - ou * ou número.)
  fixed = fixed.replace(/^(\s*[-*]\s+.+)$/gm, '<<<LIST_ITEM>>>$1<<<LIST_ITEM_END>>>')
  fixed = fixed.replace(/^(\s*\d+\.\s+.+)$/gm, '<<<LIST_ITEM>>>$1<<<LIST_ITEM_END>>>')

  // 4. Preservar blocos de citação (linhas que começam com >)
  fixed = fixed.replace(/^(>\s+.+)$/gm, '<<<QUOTE>>>$1<<<QUOTE_END>>>')

  // 5. Preservar quebras de parágrafo (substituir \n\n por marcador especial)
  fixed = fixed.replace(/\n\n+/g, '<<<PARAGRAPH_BREAK>>>')

  // 6. AGORA: Remover TODAS as quebras de linha simples restantes
  // Essas são as quebras DENTRO dos parágrafos que estão causando o problema
  fixed = fixed.replace(/\n/g, ' ')

  // 7. Limpar múltiplos espaços que podem ter sido criados
  fixed = fixed.replace(/\s{2,}/g, ' ')

  // 8. Restaurar quebras de parágrafo
  fixed = fixed.replace(/<<<PARAGRAPH_BREAK>>>/g, '\n\n')

  // 9. Restaurar marcadores de página (com quebras de parágrafo ao redor)
  fixed = fixed.replace(/<<<PAGE_MARKER_(\d+)>>>/g, '\n\n[PAGE_$1]\n\n')

  // 10. Restaurar títulos markdown (com quebras ao redor)
  fixed = fixed.replace(/<<<HEADING>>>(.+?)<<<HEADING_END>>>/g, '\n\n$1\n\n')

  // 11. Restaurar listas (com quebra antes)
  fixed = fixed.replace(/<<<LIST_ITEM>>>(.+?)<<<LIST_ITEM_END>>>/g, '\n$1')

  // 12. Restaurar blocos de citação (com quebra antes)
  fixed = fixed.replace(/<<<QUOTE>>>(.+?)<<<QUOTE_END>>>/g, '\n$1')

  // 13. Limpar quebras múltiplas que podem ter sido criadas
  fixed = fixed.replace(/\n{3,}/g, '\n\n')

  // 14. Trim
  fixed = fixed.trim()

  return fixed
}

async function fixAllTexts() {
  try {
    console.log('🔧 Buscando textos formatados para corrigir...\n')

    const mobileTexts = await prisma.pdfMobileText.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📄 Encontrados ${mobileTexts.length} textos para processar\n`)

    for (const mobileText of mobileTexts) {
      console.log(`\n🔄 Processando texto ID: ${mobileText.id}`)
      console.log(`   Material ID: ${mobileText.materialId}`)

      const originalText = mobileText.formattedText

      // Análise ANTES
      const beforeNewlines = (originalText.match(/\n/g) || []).length
      const beforeDoubleNewlines = (originalText.match(/\n\n/g) || []).length
      const beforeParagraphs = originalText.split('\n\n').length

      console.log(`\n   📊 ANTES:`)
      console.log(`      Quebras de linha simples: ${beforeNewlines}`)
      console.log(`      Quebras de linha duplas: ${beforeDoubleNewlines}`)
      console.log(`      Parágrafos: ${beforeParagraphs}`)

      // Aplicar correção
      const fixedText = fixParagraphBreaks(originalText)

      // Análise DEPOIS
      const afterNewlines = (fixedText.match(/\n/g) || []).length
      const afterDoubleNewlines = (fixedText.match(/\n\n/g) || []).length
      const afterParagraphs = fixedText.split('\n\n').length

      console.log(`\n   📊 DEPOIS:`)
      console.log(`      Quebras de linha simples: ${afterNewlines}`)
      console.log(`      Quebras de linha duplas: ${afterDoubleNewlines}`)
      console.log(`      Parágrafos: ${afterParagraphs}`)

      // Verificar se marcadores de página foram preservados
      const beforeMarkers = (originalText.match(/\[PAGE_\d+\]/g) || []).length
      const afterMarkers = (fixedText.match(/\[PAGE_\d+\]/g) || []).length

      console.log(`\n   ✅ Marcadores de página: ${beforeMarkers} → ${afterMarkers}`)

      if (beforeMarkers !== afterMarkers) {
        console.log(`   ⚠️  AVISO: Marcadores perdidos! Pulando este texto.`)
        continue
      }

      // Mostrar amostra
      console.log(`\n   🔍 AMOSTRA DO TEXTO CORRIGIDO (chars 1000-1500):`)
      console.log(`   ${'─'.repeat(70)}`)
      console.log(`   ${fixedText.substring(1000, 1500)}`)
      console.log(`   ${'─'.repeat(70)}`)

      // Perguntar se quer aplicar
      console.log(`\n   ❓ Atualizar este texto no banco? (pressione Ctrl+C para cancelar)`)

      // Atualizar no banco
      await prisma.pdfMobileText.update({
        where: { id: mobileText.id },
        data: { formattedText: fixedText }
      })

      console.log(`   ✅ Texto atualizado com sucesso!`)
    }

    console.log(`\n\n✅ Processamento concluído!`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAllTexts()
