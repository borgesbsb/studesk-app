const isPageContent = (text: string): boolean => {
  const lowerText = text.toLowerCase().trim()
  
  // Identificar páginas que devem ser ignoradas
  const skipPatterns = [
    // Padrões de sumário
    /^sumário$/,
    /^índice$/,
    /^conteúdo$/,
    /^table of contents$/,
    // Padrões de capa e páginas iniciais
    /^capa$/,
    /^apresentação$/,
    /^prefácio$/,
    /^agradecimentos$/,
    /^introdução$/,
    /^prefácio$/,
    /^dedicatória$/,
    /^epígrafe$/,
    // Padrões de referências e finais
    /^referências$/,
    /^bibliografia$/,
    /^referências bibliográficas$/,
    /^anexos?$/,
    /^apêndices?$/,
    /^glossário$/,
    // Números de página isolados
    /^\d+$/,
    // Cabeçalhos e rodapés comuns
    /^página \d+$/,
    /^page \d+$/,
    // Títulos de seções vazias
    /^capítulo \d+$/,
    /^chapter \d+$/,
    /^seção \d+$/,
    /^section \d+$/
  ]

  // Se o texto corresponde a algum padrão para ignorar
  if (skipPatterns.some(pattern => pattern.test(lowerText))) {
    return false
  }

  // Se o texto é muito curto e não parece ser conteúdo
  if (text.length < 50 && !/[.!?]/.test(text)) {
    return false
  }

  // Ignorar texto que parece ser apenas título/cabeçalho
  if (text.length < 100 && /^[A-Z\s\d\.]+$/.test(text)) {
    return false
  }

  return true
}

export const cleanText = (text: string): string => {
  return text
    // Remove quebras de linha excessivas
    .replace(/\n{3,}/g, '\n\n')
    // Remove espaços em branco excessivos
    .replace(/\s{2,}/g, ' ')
    // Remove hífens de palavras quebradas entre linhas
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // Remove caracteres especiais indesejados mantendo acentuação
    .replace(/[^\w\sáàâãéèêíïóôõöúüçñ.,!?;:'"()\-\n]/gi, '')
    // Normaliza aspas e apóstrofos
    .replace(/[''‚‛]/g, "'")
    .replace(/[""„‟]/g, '"')
    // Remove números de página isolados
    .replace(/^\d+$\n/gm, '')
    // Remove linhas que são apenas espaços
    .replace(/^\s+$/gm, '')
    // Remove espaços no início e fim
    .trim()
}

const shouldSkipParagraph = (paragraph: string): boolean => {
  const lowerParagraph = paragraph.toLowerCase().trim()
  
  // Padrões de seções a serem ignoradas
  const skipSectionPatterns = [
    // Títulos e seções introdutórias
    /^(título|title)\s*\d*/,
    /^(capítulo|chapter)\s*\d*/,
    /^(seção|section)\s*\d*/,
    /^(parte|part)\s*\d*/,
    /^apresentação/,
    /^introdução/,
    /^prefácio/,
    /^sumário/,
    /^índice/,
    /^agradecimentos/,
    /^dedicatória/,
    /^epígrafe/,
    /^considerações iniciais/,
    /^nota do autor/,
    /^nota editorial/,
    // Padrões de referências e finais
    /^referências/,
    /^bibliografia/,
    /^anexos?/,
    /^apêndices?/,
    /^glossário/,
    /^conclusão/,
    /^considerações finais/,
    // Cabeçalhos e rodapés
    /^página \d+/,
    /^\d+\s*$/,
    // URLs e referências web
    /^(http|https|www)/,
    // Apenas pontuação ou números
    /^[\d\s\.\-\(\)]+$/
  ]
  
  return skipSectionPatterns.some(pattern => pattern.test(lowerParagraph))
}

export const organizeParagraphs = (text: string): string[] => {
  // Divide o texto em parágrafos e limpa
  const rawParagraphs = text.split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    // Remove parágrafos que são apenas números (páginas)
    .filter(p => !/^\d+$/.test(p))
    // Remove seções indesejadas
    .filter(p => !shouldSkipParagraph(p))
    // Junta linhas quebradas dentro do mesmo parágrafo
    .map(p => p.replace(/\n/g, ' '))
    // Remove espaços extras
    .map(p => p.replace(/\s+/g, ' ').trim())
    // Remove parágrafos que são apenas títulos em maiúsculas
    .filter(p => !(p.length < 100 && /^[A-Z\s\d\.\-\(\)]+$/.test(p)))

  // Melhora a organização dos parágrafos
  const organizedParagraphs = []
  let currentParagraph = ''

  for (const paragraph of rawParagraphs) {
    // Se o parágrafo é muito curto, tenta juntar com o próximo
    if (paragraph.length < 150 && !paragraph.match(/[.!?]$/)) {
      currentParagraph += (currentParagraph ? ' ' : '') + paragraph
    } else {
      // Se há um parágrafo em construção, adiciona a ele
      if (currentParagraph) {
        currentParagraph += ' ' + paragraph
        if (currentParagraph.length > 100) {
          organizedParagraphs.push(currentParagraph)
        }
        currentParagraph = ''
      } else {
        if (paragraph.length > 100) {
          organizedParagraphs.push(paragraph)
        }
      }
    }
  }

  // Adiciona qualquer parágrafo restante se for substantivo
  if (currentParagraph && currentParagraph.length > 100) {
    organizedParagraphs.push(currentParagraph)
  }

  // Filtra parágrafos finais garantindo qualidade do conteúdo
  return organizedParagraphs.filter(p => {
    // Mantém parágrafos que:
    // 1. São longos o suficiente (>100 caracteres) E
    // 2. Contêm pelo menos uma frase completa E
    // 3. Não são apenas listas ou enumerações
    return p.length > 100 && 
           /[.!?]/.test(p) &&
           !/^[\d\.\-\s\(\)]+/.test(p) &&
           (p.match(/\b\w+\b/g) || []).length > 10 // Pelo menos 10 palavras
  })
} 