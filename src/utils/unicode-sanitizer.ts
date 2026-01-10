/**
 * Utilitário para sanitizar texto com caracteres Unicode inválidos
 *
 * Resolve problema de "no low surrogate" que causa erro 400 em APIs
 * quando texto extraído de PDFs contém surrogates mal formados
 */

/**
 * Remove caracteres Unicode inválidos e mal formados de uma string
 *
 * @param text - Texto a ser sanitizado
 * @returns Texto limpo sem caracteres Unicode inválidos
 *
 * @example
 * ```ts
 * const dirtyText = "Texto com \uD800 surrogate inválido"
 * const cleanText = sanitizeUnicode(dirtyText)
 * // cleanText = "Texto com  surrogate inválido"
 * ```
 */
export function sanitizeUnicode(text: string): string {
  // Remove pares de surrogates mal formados
  // High surrogates: 0xD800-0xDBFF, Low surrogates: 0xDC00-0xDFFF
  return text
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Remove high surrogate sem low surrogate
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // Remove low surrogate sem high surrogate
    .replace(/\uFFFD/g, '') // Remove caractere de substituição Unicode
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove caracteres de controle exceto \n, \r, \t
}

/**
 * Sanitiza um array de strings
 *
 * @param texts - Array de textos a serem sanitizados
 * @returns Array de textos limpos
 */
export function sanitizeUnicodeArray(texts: string[]): string[] {
  return texts.map(sanitizeUnicode)
}

/**
 * Sanitiza um objeto recursivamente, aplicando sanitização em todas as propriedades string
 *
 * @param obj - Objeto a ser sanitizado
 * @returns Objeto com todas as strings sanitizadas
 */
export function sanitizeUnicodeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeUnicode(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeUnicodeObject) as T
  }

  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeUnicodeObject(value)
    }
    return result
  }

  return obj
}

/**
 * Valida se uma string contém surrogates mal formados
 *
 * @param text - Texto a ser validado
 * @returns true se o texto contém surrogates inválidos
 */
export function hasInvalidSurrogates(text: string): boolean {
  // Verifica high surrogate sem low surrogate
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(text)) {
    return true
  }

  // Verifica low surrogate sem high surrogate
  if (/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text)) {
    return true
  }

  return false
}
