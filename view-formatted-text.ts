import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function viewFormattedText() {
  try {
    console.log('🔍 Buscando último texto formatado...\n')

    const mobileText = await prisma.pdfMobileText.findFirst({
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        materialId: true,
        formattedText: true,
        aiModel: true,
        tokensUsed: true,
        createdAt: true,
        updatedAt: true,
        material: {
          select: {
            nome: true
          }
        }
      }
    })

    if (!mobileText) {
      console.log('❌ Nenhum texto formatado encontrado')
      return
    }

    console.log('📄 INFORMAÇÕES DO TEXTO:')
    console.log('─'.repeat(80))
    console.log('ID:', mobileText.id)
    console.log('Material:', mobileText.material?.nome || 'N/A')
    console.log('Material ID:', mobileText.materialId)
    console.log('Modelo IA:', mobileText.aiModel)
    console.log('Tokens usados:', mobileText.tokensUsed)
    console.log('Criado em:', mobileText.createdAt.toLocaleString('pt-BR'))
    console.log('Atualizado em:', mobileText.updatedAt.toLocaleString('pt-BR'))
    console.log('Tamanho:', mobileText.formattedText.length, 'caracteres')
    console.log('─'.repeat(80))
    console.log('')

    // Estatísticas
    const text = mobileText.formattedText
    const newlineCount = (text.match(/\n/g) || []).length
    const doubleNewlineCount = (text.match(/\n\n/g) || []).length
    const pageMarkers = (text.match(/\[PAGE_\d+\]/g) || [])

    console.log('📊 ESTATÍSTICAS:')
    console.log('─'.repeat(80))
    console.log('Quebras de linha simples (\\n):', newlineCount)
    console.log('Quebras de linha duplas (\\n\\n):', doubleNewlineCount)
    console.log('Marcadores de página:', pageMarkers.length)
    console.log('─'.repeat(80))
    console.log('')

    // Mostrar diferentes partes do texto
    console.log('📖 VISUALIZAÇÃO DO TEXTO:')
    console.log('═'.repeat(80))
    console.log('')

    console.log('🔹 INÍCIO DO TEXTO (primeiros 2000 caracteres):')
    console.log('─'.repeat(80))
    console.log(text.substring(0, 2000))
    console.log('─'.repeat(80))
    console.log('')

    console.log('🔹 MEIO DO TEXTO (caracteres 10000-12000):')
    console.log('─'.repeat(80))
    console.log(text.substring(10000, 12000))
    console.log('─'.repeat(80))
    console.log('')

    console.log('🔹 FINAL DO TEXTO (últimos 1000 caracteres):')
    console.log('─'.repeat(80))
    console.log(text.slice(-1000))
    console.log('─'.repeat(80))
    console.log('')

    // Salvar em arquivo para visualização completa
    const outputDir = path.join(process.cwd(), 'temp-output')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, 'formatted-text-viewer.md')
    fs.writeFileSync(outputPath, text, 'utf-8')

    console.log('💾 TEXTO COMPLETO SALVO EM:')
    console.log('─'.repeat(80))
    console.log(outputPath)
    console.log('─'.repeat(80))
    console.log('')
    console.log('Você pode abrir este arquivo em qualquer editor de texto ou markdown viewer')
    console.log('')

    // Mostrar exemplo de um parágrafo específico
    const paragraphs = text.split('\n\n')
    const normalParagraphs = paragraphs.filter(p =>
      p.length > 100 &&
      p.length < 1000 &&
      !p.startsWith('#') &&
      !p.startsWith('[PAGE_')
    )

    if (normalParagraphs.length > 0) {
      console.log('🔹 EXEMPLO DE PARÁGRAFO (para verificar quebras de linha):')
      console.log('─'.repeat(80))
      console.log(normalParagraphs[5] || normalParagraphs[0])
      console.log('─'.repeat(80))
      console.log('')

      // Mostrar versão com \n visível
      const examplePara = normalParagraphs[5] || normalParagraphs[0]
      console.log('🔹 MESMO PARÁGRAFO COM \\n VISÍVEL:')
      console.log('─'.repeat(80))
      console.log(examplePara.replace(/\n/g, '⏎\n'))
      console.log('─'.repeat(80))
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

viewFormattedText()
