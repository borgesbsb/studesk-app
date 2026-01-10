import { NextResponse } from 'next/server'
import {
  HeaderFooterDetectorService,
  HeaderFooterPattern,
} from '@/application/services/header-footer-detector.service'

export async function GET() {
  try {
    // Texto de exemplo simulando 3 páginas de PDF com cabeçalhos e rodapés
    const pagesText = [
      `Equipe Direito Administrativo, Herbert Almeida, Paulo H M Sousa, Aula 00

Introdução ao Direito Administrativo

O Direito Administrativo é o ramo do direito público que disciplina a função administrativa e os órgãos que a exercem.

A Administração Pública direta compreende os órgãos integrados na estrutura administrativa da União, dos Estados, do Distrito Federal e dos Municípios.

www.estrategiaconcursos.com.br
Página 1 de 150`,

      `Equipe Direito Administrativo, Herbert Almeida, Paulo H M Sousa, Aula 00

Princípios da Administração Pública

Os princípios constitucionais explícitos são: legalidade, impessoalidade, moralidade, publicidade e eficiência (LIMPE).

A legalidade significa que o administrador público está, em toda a sua atividade funcional, sujeito aos mandamentos da lei.

www.estrategiaconcursos.com.br
Página 2 de 150`,

      `Equipe Direito Administrativo, Herbert Almeida, Paulo H M Sousa, Aula 00

Organização Administrativa

A organização administrativa brasileira segue dois princípios fundamentais: a descentralização e a desconcentração.

A descentralização ocorre quando o Estado distribui suas competências para outras pessoas jurídicas.

www.estrategiaconcursos.com.br
Página 3 de 150`
    ]

    console.log('🧪 Step 3: Testando APLICAÇÃO de padrões...')

    const detector = new HeaderFooterDetectorService()

    // 1. Detectar padrões com IA
    console.log('🔍 1. Detectando padrões com IA...')
    const detection = await detector.detectPatterns(pagesText)
    console.log(`   ✅ Detectados ${detection.patterns.length} padrões`)

    // 2. Aplicar padrões em cada página
    console.log('\n🧹 2. Aplicando padrões para limpar texto...')
    const cleanedPages = pagesText.map((pageText, index) => {
      console.log(`\n   📄 Página ${index + 1}:`)
      console.log(`      ANTES (${pageText.length} chars): ${pageText.substring(0, 100)}...`)

      const cleaned = detector.applyPatterns(pageText, detection.patterns)

      console.log(`      DEPOIS (${cleaned.length} chars): ${cleaned.substring(0, 100)}...`)

      return {
        pageNumber: index + 1,
        original: pageText,
        cleaned: cleaned,
        originalLength: pageText.length,
        cleanedLength: cleaned.length,
        reduction: pageText.length - cleaned.length,
        reductionPercent: Math.round(((pageText.length - cleaned.length) / pageText.length) * 100)
      }
    })

    // 3. Combinar páginas limpas
    const fullCleanedText = cleanedPages.map(p => p.cleaned).join('\n\n')

    console.log('\n📊 RESUMO:')
    console.log(`   Total de padrões: ${detection.patterns.length}`)
    console.log(`   Páginas processadas: ${cleanedPages.length}`)
    console.log(`   Redução média: ${Math.round(cleanedPages.reduce((acc, p) => acc + p.reductionPercent, 0) / cleanedPages.length)}%`)

    return NextResponse.json({
      success: true,
      message: 'Aplicação de padrões completada!',
      detection: {
        patternsFound: detection.patterns.length,
        tokensUsed: detection.tokensUsed,
        confidence: detection.confidence,
        patterns: detection.patterns
      },
      cleaning: {
        pagesProcessed: cleanedPages.length,
        averageReduction: Math.round(cleanedPages.reduce((acc, p) => acc + p.reductionPercent, 0) / cleanedPages.length),
        pages: cleanedPages.map(p => ({
          pageNumber: p.pageNumber,
          originalLength: p.originalLength,
          cleanedLength: p.cleanedLength,
          reduction: p.reduction,
          reductionPercent: p.reductionPercent,
          cleanedPreview: p.cleaned.substring(0, 200)
        }))
      },
      fullCleanedText: fullCleanedText
    })
  } catch (error: any) {
    console.error('❌ Erro ao testar aplicação de padrões:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
