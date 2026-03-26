/**
 * Converte texto extraído de PDF para Markdown estruturado.
 * Usa heurísticas para detectar headers, listas e parágrafos.
 */
export function pdfToMarkdown(texto: string): string {
  const linhas = texto.split('\n')
  const resultado: string[] = []
  let anteriorVazia = true

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim()

    // Ignora linhas completamente vazias (mas marca separação)
    if (!linha) {
      if (!anteriorVazia) resultado.push('')
      anteriorVazia = true
      continue
    }

    anteriorVazia = false

    // Numeração tipo "1.", "2.1", "ITEM 1", "I.", "II." → header H3
    if (/^(\d+\.(\d+\.?)*|[IVXLC]+\.)\s+\S/.test(linha) && linha.length < 120) {
      resultado.push(`### ${linha}`)
      continue
    }

    // Linha em CAIXA ALTA com > 5 chars e < 120 chars → header H2
    const semPontuacao = linha.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '')
    if (
      linha === linha.toUpperCase() &&
      semPontuacao.replace(/\s/g, '').length > 5 &&
      linha.length < 120 &&
      !/^\d+$/.test(linha) // não é só número
    ) {
      resultado.push(`## ${linha}`)
      continue
    }

    // Bullets/listas: linhas que começam com -, •, *, a), b), 1)
    if (/^[-•*]\s+/.test(linha)) {
      resultado.push(`- ${linha.replace(/^[-•*]\s+/, '')}`)
      continue
    }
    if (/^[a-z]\)\s+/i.test(linha) || /^\d+\)\s+/.test(linha)) {
      resultado.push(`- ${linha}`)
      continue
    }

    // Texto normal
    resultado.push(linha)
  }

  // Junta linhas consecutivas não-vazias em parágrafos
  return resultado.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
