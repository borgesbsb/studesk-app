import * as pdfjsLib from 'pdfjs-dist'

// Inicializar o PDF.js uma vez
const initPdfJs = async () => {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Usar o worker a partir do diretório public
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
  }
}

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

const cleanText = (text: string): string => {
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

const organizeParagraphs = (text: string): string[] => {
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

export async function extractTextFromPdf(pdfUrl: string): Promise<string[]> {
  try {
    // Tentar primeiro usando a API do servidor (mais confiável)
    console.log('🔄 Tentando extração via API do servidor...')
    
    const response = await fetch('/api/pdf/extract-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdfUrl })
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success && result.paragraphs) {
        console.log('✅ Extração via API bem-sucedida:', result.paragraphs.length, 'parágrafos')
        return result.paragraphs
      }
    }

    // Se a API falhar, tentar método cliente como fallback
    console.log('⚠️ API falhou, tentando extração no cliente...')
    
    // Inicializar PDF.js
    await initPdfJs()

    // Garantir que a URL é absoluta
    const absoluteUrl = new URL(pdfUrl, window.location.origin).toString()

    // Carregar o PDF
    const loadingTask = pdfjsLib.getDocument({ url: absoluteUrl })
    const pdf = await loadingTask.promise
    const totalPages = pdf.numPages
    let pageContents: string[] = []

    // Extrair texto de cada página
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      const pageText = textContent.items
        .map((item: { str: string }) => item.str)
        .join(' ')
        .trim()

      if (isPageContent(pageText)) {
        pageContents.push(pageText)
      }
    }

    const extractedText = cleanText(pageContents.join('\n\n'))
    const organizedParagraphs = organizeParagraphs(extractedText)
    
    console.log('✅ Extração no cliente bem-sucedida:', organizedParagraphs.length, 'parágrafos')
    return organizedParagraphs
    
  } catch (error) {
    console.error('❌ Erro ao extrair texto do PDF:', error)
    
    // Tentar uma última vez apenas com fallback básico se possível
    try {
      console.log('🔄 Tentando método de fallback básico...')
      
      // Se for um erro de CORS ou worker, tentar sem worker
      await initPdfJs()
      const response = await fetch(new URL(pdfUrl, window.location.origin).toString())
      
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        
        // Verificar se é um PDF básico
        const uint8Array = new Uint8Array(arrayBuffer)
        const header = new TextDecoder().decode(uint8Array.slice(0, 4))
        
        if (header === '%PDF') {
          // É um PDF válido, mas não conseguimos extrair
          throw new Error('PDF válido encontrado, mas não foi possível extrair o texto. O arquivo pode estar protegido ou corrompido.')
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback também falhou:', fallbackError)
    }
    
    throw new Error('Falha ao extrair texto do PDF. Verifique se o arquivo não está corrompido ou protegido por senha.')
  }
} 