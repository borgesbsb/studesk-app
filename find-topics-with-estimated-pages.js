const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findTopicsWithPages() {
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

    const totalPaginas = material.totalPaginas
    const texto = material.mobileText.formattedText
    const tamanhoTexto = texto.length

    console.log(`\n📄 Material: ${material.nome}`)
    console.log(`   Total de páginas: ${totalPaginas}`)
    console.log(`   Tamanho do texto: ${tamanhoTexto.toLocaleString('pt-BR')} caracteres`)
    console.log(`   Média: ~${Math.round(tamanhoTexto / totalPaginas)} caracteres/página\n`)

    // Função para estimar a página baseada na posição no texto
    function estimarPagina(posicao) {
      const paginaEstimada = Math.floor((posicao / tamanhoTexto) * totalPaginas) + 1
      return Math.min(paginaEstimada, totalPaginas)
    }

    // Tópicos do edital com regex
    const topicos = [
      { nome: 'Administração pública', regex: /administra[cç][aã]o\s+p[uú]blica/gi, emoji: '🏛️' },
      { nome: 'Princípios básicos', regex: /princ[ií]pios?\s+(b[aá]sicos?|fundamentais?|da\s+administra[cç][aã]o)/gi, emoji: '📜' },
      { nome: 'Poder hierárquico', regex: /poder\s+hier[aá]rquico/gi, emoji: '📊' },
      { nome: 'Poder disciplinar', regex: /poder\s+disciplinar/gi, emoji: '⚖️' },
      { nome: 'Poder regulamentar', regex: /poder\s+regulamentar/gi, emoji: '📋' },
      { nome: 'Poder de polícia', regex: /poder\s+de\s+pol[ií]cia/gi, emoji: '🚓' },
      { nome: 'Uso e abuso do poder', regex: /(uso|abuso)\s+(e|do|ou)\s+(abuso\s+do\s+)?poder/gi, emoji: '⚠️' },
      { nome: 'Ato administrativo', regex: /atos?\s+administrativos?/gi, emoji: '📄' },
      { nome: 'Requisitos e atributos', regex: /(requisitos?|elementos?)\s+(e|ou)\s+atributos?/gi, emoji: '✔️' },
      { nome: 'Anulação', regex: /anula[cç][aã]o/gi, emoji: '❌' },
      { nome: 'Revogação', regex: /revoga[cç][aã]o/gi, emoji: '🔄' },
      { nome: 'Convalidação', regex: /convalida[cç][aã]o/gi, emoji: '✅' },
      { nome: 'Discricionariedade', regex: /discricion[aá]rios?|discricionariedade/gi, emoji: '🎯' },
      { nome: 'Vinculação', regex: /vincula[cç][aã]o|vinculados?/gi, emoji: '🔗' },
      { nome: 'Organização administrativa', regex: /organiza[cç][aã]o\s+administrativa/gi, emoji: '🏢' },
      { nome: 'Administração direta', regex: /administra[cç][aã]o\s+direta/gi, emoji: '➡️' },
      { nome: 'Administração indireta', regex: /administra[cç][aã]o\s+indireta/gi, emoji: '↘️' },
      { nome: 'Centralizada', regex: /centraliza[cç][aã]o|centralizad[oa]s?/gi, emoji: '🎯' },
      { nome: 'Descentralizada', regex: /descentraliza[cç][aã]o|descentralizad[oa]s?/gi, emoji: '🌐' },
      { nome: 'Autarquias', regex: /autarquias?/gi, emoji: '🏛️' },
      { nome: 'Fundações', regex: /funda[cç][oõ]es?\s*(p[uú]blicas?)?/gi, emoji: '🏗️' },
      { nome: 'Empresas públicas', regex: /empresas?\s+p[uú]blicas?/gi, emoji: '🏭' },
      { nome: 'Sociedades de economia mista', regex: /sociedades?\s+de\s+economia\s+mista/gi, emoji: '🤝' }
    ]

    console.log(`\n${'='.repeat(90)}`)
    console.log(`🔍 MAPEAMENTO DE TÓPICOS DO EDITAL POR PÁGINA (estimada)`)
    console.log(`${'='.repeat(90)}\n`)

    const resultados = []

    for (const topico of topicos) {
      const matches = [...texto.matchAll(topico.regex)]

      if (matches.length > 0) {
        // Agrupar ocorrências por página estimada
        const ocorrenciasPorPagina = new Map()

        for (const match of matches) {
          const posicao = match.index
          const paginaEstimada = estimarPagina(posicao)

          if (!ocorrenciasPorPagina.has(paginaEstimada)) {
            ocorrenciasPorPagina.set(paginaEstimada, 0)
          }
          ocorrenciasPorPagina.set(paginaEstimada, ocorrenciasPorPagina.get(paginaEstimada) + 1)
        }

        // Ordenar páginas
        const paginas = Array.from(ocorrenciasPorPagina.keys()).sort((a, b) => a - b)
        const primeiraPagina = paginas[0]
        const totalOcorrencias = matches.length

        resultados.push({
          topico: topico.nome,
          emoji: topico.emoji,
          primeiraPagina,
          paginas,
          ocorrenciasPorPagina,
          totalOcorrencias,
          encontrado: true
        })

        console.log(`${topico.emoji} ${topico.nome}`)
        console.log(`   📍 Primeira aparição: Página ~${primeiraPagina}`)
        console.log(`   📊 Total de ocorrências: ${totalOcorrencias}`)

        if (paginas.length <= 5) {
          console.log(`   📄 Páginas: ${paginas.map(p => `~${p}`).join(', ')}`)
        } else {
          console.log(`   📄 Principais páginas: ${paginas.slice(0, 5).map(p => `~${p}`).join(', ')} ...`)
        }
        console.log('')
      } else {
        resultados.push({
          topico: topico.nome,
          emoji: topico.emoji,
          encontrado: false
        })
        console.log(`❌ ${topico.nome}`)
        console.log(`   Não encontrado no documento\n`)
      }
    }

    console.log(`${'='.repeat(90)}`)
    console.log(`\n📊 RESUMO POR PÁGINA\n`)

    // Criar mapa de páginas com tópicos
    const topicosPorPagina = new Map()

    for (const resultado of resultados) {
      if (resultado.encontrado) {
        for (const pagina of resultado.paginas) {
          if (!topicosPorPagina.has(pagina)) {
            topicosPorPagina.set(pagina, [])
          }
          topicosPorPagina.get(pagina).push({
            nome: resultado.topico,
            emoji: resultado.emoji,
            ocorrencias: resultado.ocorrenciasPorPagina.get(pagina)
          })
        }
      }
    }

    // Ordenar e mostrar páginas com mais tópicos
    const paginasOrdenadas = Array.from(topicosPorPagina.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)

    console.log(`🎯 Top 10 páginas com mais tópicos do edital:\n`)

    for (const [pagina, topicos] of paginasOrdenadas) {
      console.log(`   Página ~${pagina}: ${topicos.length} tópico(s)`)
      for (const t of topicos) {
        console.log(`      ${t.emoji} ${t.nome} (${t.ocorrencias}x)`)
      }
      console.log('')
    }

    const topicosEncontrados = resultados.filter(r => r.encontrado).length
    console.log(`${'='.repeat(90)}`)
    console.log(`\n✅ Total: ${topicosEncontrados}/${topicos.length} tópicos encontrados`)
    console.log(`\n⚠️  Nota: As páginas são estimativas baseadas na posição relativa no texto extraído.`)
    console.log(`   Para páginas exatas, consulte o PDF original.\n`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findTopicsWithPages()
