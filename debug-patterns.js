const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const mobileText = await prisma.pdfMobileText.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!mobileText) {
    console.log('❌ Nenhum registro encontrado')
    return
  }

  console.log('📋 Material ID:', mobileText.materialId)
  console.log('📄 Total de páginas:', mobileText.totalPages)
  console.log('✅ Páginas processadas:', mobileText.processedPages)
  console.log('')

  if (mobileText.headerFooterPatterns) {
    console.log('🤖 Padrões detectados pela IA:')
    const patterns = JSON.parse(mobileText.headerFooterPatterns)
    patterns.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.description} (${p.type})`)
      console.log(`   Exemplo: "${p.exampleText}"`)
      console.log(`   Regex: /${p.regexPattern}/i`)
    })
  } else {
    console.log('⚠️  Nenhum padrão salvo')
  }

  console.log('\n📝 Primeiros 500 caracteres do texto formatado:')
  console.log(mobileText.formattedText.substring(0, 500))
  console.log('...')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
