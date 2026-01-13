const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMaterialContent() {
  try {
    // Buscar materiais da disciplina
    const disciplinaMateriais = await prisma.disciplinaMaterial.findMany({
      where: {
        disciplinaId: 'cmion5u220003c9rc6frj89nx'
      },
      include: {
        material: {
          include: {
            mobileText: true
          }
        },
        disciplina: true
      }
    })

    console.log(`\n📚 Encontrados ${disciplinaMateriais.length} materiais na disciplina "${disciplinaMateriais[0]?.disciplina.nome}"\n`)

    for (const dm of disciplinaMateriais) {
      const material = dm.material
      console.log(`\n📄 Material: ${material.nome}`)
      console.log(`   Tipo: ${material.tipo}`)
      console.log(`   Total de páginas: ${material.totalPaginas}`)

      if (material.mobileText) {
        const texto = material.mobileText.formattedText
        const totalCaracteres = texto.length

        console.log(`   ✅ Texto extraído: ${totalCaracteres.toLocaleString('pt-BR')} caracteres`)
        console.log(`   Status: ${material.mobileText.processingStatus}`)
        console.log(`   Páginas processadas: ${material.mobileText.processedPages}/${material.mobileText.totalPages}`)

        // Verificar presença dos tópicos do edital
        const topicos = {
          'Administração pública': /administra[cç][aã]o\s+p[uú]blica/i,
          'Princípios básicos': /princ[ií]pios?\s+(b[aá]sicos?|fundamentais?)/i,
          'Poder hierárquico': /poder\s+hier[aá]rquico/i,
          'Poder disciplinar': /poder\s+disciplinar/i,
          'Poder regulamentar': /poder\s+regulamentar/i,
          'Poder de polícia': /poder\s+de\s+pol[ií]cia/i,
          'Uso e abuso do poder': /(uso|abuso)\s+(e|do)\s+(abuso\s+do\s+)?poder/i,
          'Ato administrativo': /ato\s+administrativo/i,
          'Requisitos e atributos': /requisitos?\s+(e|ou)\s+atributos?/i,
          'Anulação': /anula[cç][aã]o/i,
          'Revogação': /revoga[cç][aã]o/i,
          'Convalidação': /convalida[cç][aã]o/i,
          'Discricionariedade': /discricionariedade/i,
          'Vinculação': /vincula[cç][aã]o/i,
          'Organização administrativa': /organiza[cç][aã]o\s+administrativa/i,
          'Administração direta': /administra[cç][aã]o\s+direta/i,
          'Administração indireta': /administra[cç][aã]o\s+indireta/i,
          'Centralizada': /centralizada/i,
          'Descentralizada': /descentralizada/i,
          'Autarquias': /autarquias?/i,
          'Fundações': /funda[cç][oõ]es?\s+(p[uú]blicas?)?/i,
          'Empresas públicas': /empresas?\s+p[uú]blicas?/i,
          'Sociedades de economia mista': /sociedades?\s+de\s+economia\s+mista/i
        }

        console.log(`\n   🔍 Verificação de tópicos do edital:\n`)

        let topicosEncontrados = 0
        let topicosNaoEncontrados = 0

        for (const [topico, regex] of Object.entries(topicos)) {
          const encontrado = regex.test(texto)
          if (encontrado) {
            console.log(`   ✅ ${topico}`)
            topicosEncontrados++
          } else {
            console.log(`   ❌ ${topico}`)
            topicosNaoEncontrados++
          }
        }

        console.log(`\n   📊 Resumo: ${topicosEncontrados}/${Object.keys(topicos).length} tópicos encontrados`)

        const cobertura = (topicosEncontrados / Object.keys(topicos).length) * 100
        console.log(`   📈 Cobertura: ${cobertura.toFixed(1)}%`)

        if (cobertura >= 80) {
          console.log(`   🎉 Excelente! O material cobre a maioria dos tópicos do edital.`)
        } else if (cobertura >= 50) {
          console.log(`   ✔️  Bom! O material cobre metade dos tópicos do edital.`)
        } else if (cobertura >= 30) {
          console.log(`   ⚠️  Parcial. O material cobre alguns tópicos do edital.`)
        } else {
          console.log(`   ⚠️  Baixa cobertura. O material pode não cobrir os tópicos do edital.`)
        }

      } else {
        console.log(`   ❌ Texto não extraído`)
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMaterialContent()
