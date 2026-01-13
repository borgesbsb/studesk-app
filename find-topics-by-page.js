const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findTopicsByPage() {
  try {
    // Buscar o material específico
    const material = await prisma.materialEstudo.findFirst({
      where: {
        nome: 'curso-244688-aula-00-a0d3-completo'
      },
      include: {
        mobileText: true
      }
    })

    if (!material || !material.mobileText) {
      console.log('❌ Material ou texto não encontrado')
      return
    }

    console.log(`\n📄 Material: ${material.nome}`)
    console.log(`   Total de páginas: ${material.totalPaginas}`)
    console.log(`   Texto extraído: ${material.mobileText.formattedText.length.toLocaleString('pt-BR')} caracteres\n`)

    const texto = material.mobileText.formattedText

    // Dividir o texto em "páginas" aproximadas
    // Vamos usar marcadores de página se existirem, ou dividir por tamanho
    const linhas = texto.split('\n')

    // Tentar encontrar marcadores de página (ex: "Página 1", "--- Página 2 ---", etc)
    const marcadoresPagina = []
    let paginaAtual = 1
    let posicaoAtual = 0

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]

      // Verificar se a linha é um marcador de página
      const matchPagina = linha.match(/^[\s\-]*p[áa]gina\s*(\d+)[\s\-]*$/i) ||
                          linha.match(/^[\s\-]*(\d+)[\s\-]*$/) ||
                          linha.match(/^#{1,3}\s*p[áa]gina\s*(\d+)/i)

      if (matchPagina && parseInt(matchPagina[1]) > paginaAtual) {
        const numeroPagina = parseInt(matchPagina[1])
        marcadoresPagina.push({
          pagina: numeroPagina,
          posicao: posicaoAtual,
          linha: i
        })
        paginaAtual = numeroPagina
      }

      posicaoAtual += linha.length + 1 // +1 para o \n
    }

    console.log(`   📌 Encontrados ${marcadoresPagina.length} marcadores de página no texto\n`)

    // Função para encontrar a página de uma posição no texto
    function encontrarPagina(posicao) {
      for (let i = marcadoresPagina.length - 1; i >= 0; i--) {
        if (posicao >= marcadoresPagina[i].posicao) {
          return marcadoresPagina[i].pagina
        }
      }
      return 1 // Se não encontrou marcador, assume página 1
    }

    // Tópicos do edital com regex
    const topicos = [
      { nome: 'Administração pública', regex: /administra[cç][aã]o\s+p[uú]blica/gi },
      { nome: 'Princípios básicos', regex: /princ[ií]pios?\s+(b[aá]sicos?|fundamentais?|da\s+administra[cç][aã]o)/gi },
      { nome: 'Poder hierárquico', regex: /poder\s+hier[aá]rquico/gi },
      { nome: 'Poder disciplinar', regex: /poder\s+disciplinar/gi },
      { nome: 'Poder regulamentar', regex: /poder\s+regulamentar/gi },
      { nome: 'Poder de polícia', regex: /poder\s+de\s+pol[ií]cia/gi },
      { nome: 'Uso e abuso do poder', regex: /(uso|abuso)\s+(e|do|ou)\s+(abuso\s+do\s+)?poder/gi },
      { nome: 'Ato administrativo', regex: /atos?\s+administrativos?/gi },
      { nome: 'Requisitos e atributos', regex: /(requisitos?|elementos?)\s+(e|ou)\s+atributos?/gi },
      { nome: 'Anulação', regex: /anula[cç][aã]o/gi },
      { nome: 'Revogação', regex: /revoga[cç][aã]o/gi },
      { nome: 'Convalidação', regex: /convalida[cç][aã]o/gi },
      { nome: 'Discricionariedade', regex: /discricion[aá]rios?|discricionariedade/gi },
      { nome: 'Vinculação', regex: /vincula[cç][aã]o|vinculados?/gi },
      { nome: 'Organização administrativa', regex: /organiza[cç][aã]o\s+administrativa/gi },
      { nome: 'Administração direta', regex: /administra[cç][aã]o\s+direta/gi },
      { nome: 'Administração indireta', regex: /administra[cç][aã]o\s+indireta/gi },
      { nome: 'Centralizada', regex: /centraliza[cç][aã]o|centralizad[oa]s?/gi },
      { nome: 'Descentralizada', regex: /descentraliza[cç][aã]o|descentralizad[oa]s?/gi },
      { nome: 'Autarquias', regex: /autarquias?/gi },
      { nome: 'Fundações', regex: /funda[cç][oõ]es?\s*(p[uú]blicas?)?/gi },
      { nome: 'Empresas públicas', regex: /empresas?\s+p[uú]blicas?/gi },
      { nome: 'Sociedades de economia mista', regex: /sociedades?\s+de\s+economia\s+mista/gi }
    ]

    console.log(`🔍 Buscando tópicos e suas páginas:\n`)
    console.log('='*80 + '\n')

    let topicosEncontrados = 0

    for (const topico of topicos) {
      const matches = [...texto.matchAll(topico.regex)]

      if (matches.length > 0) {
        topicosEncontrados++
        console.log(`✅ ${topico.nome}`)
        console.log(`   📍 Encontrado ${matches.length} vez(es) no documento:`)

        // Agrupar ocorrências por página
        const ocorrenciasPorPagina = new Map()

        for (const match of matches) {
          const posicao = match.index
          const pagina = marcadoresPagina.length > 0 ? encontrarPagina(posicao) : 'N/A'

          if (!ocorrenciasPorPagina.has(pagina)) {
            ocorrenciasPorPagina.set(pagina, [])
          }
          ocorrenciasPorPagina.get(pagina).push({
            texto: match[0],
            posicao: posicao
          })
        }

        // Ordenar páginas
        const paginasOrdenadas = Array.from(ocorrenciasPorPagina.keys()).sort((a, b) => {
          if (a === 'N/A') return 1
          if (b === 'N/A') return -1
          return a - b
        })

        for (const pagina of paginasOrdenadas) {
          const ocorrencias = ocorrenciasPorPagina.get(pagina)
          if (marcadoresPagina.length > 0) {
            console.log(`      • Página ${pagina}: ${ocorrencias.length} ocorrência(s)`)
          } else {
            console.log(`      • Posição: ${ocorrencias[0].posicao} (${ocorrencias.length} ocorrência(s))`)
          }
        }
        console.log('')
      } else {
        console.log(`❌ ${topico.nome}`)
        console.log(`   Não encontrado no documento\n`)
      }
    }

    console.log('='*80)
    console.log(`\n📊 Total: ${topicosEncontrados}/${topicos.length} tópicos encontrados`)

    if (marcadoresPagina.length === 0) {
      console.log(`\n⚠️  Nota: Não foram encontrados marcadores de página no texto formatado.`)
      console.log(`   As posições são relativas ao início do documento.`)
      console.log(`   Para melhor precisão, o PDF original deve ter marcadores de página.`)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findTopicsByPage()
