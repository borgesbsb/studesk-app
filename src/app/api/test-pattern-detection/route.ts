import { NextResponse } from 'next/server'
import { HeaderFooterDetectorService } from '@/application/services/header-footer-detector.service'

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

    console.log('🧪 Iniciando teste de detecção de padrões...')
    console.log('📝 Analisando 3 páginas de exemplo')

    const detector = new HeaderFooterDetectorService()
    const result = await detector.detectPatterns(pagesText)

    console.log(`✅ IA detectou ${result.patterns.length} padrões`)
    console.log(`🪙 Tokens usados: ${result.tokensUsed}`)
    console.log(`🎯 Confiança: ${result.confidence}`)

    // Mostrar cada padrão detectado
    result.patterns.forEach((pattern, index) => {
      console.log(`\n${index + 1}. ${pattern.description} (${pattern.type})`)
      console.log(`   Exemplo: "${pattern.exampleText}"`)
      console.log(`   Regex: /${pattern.regexPattern}/i`)
    })

    return NextResponse.json({
      success: true,
      message: 'Detecção de padrões completada!',
      detection: {
        patternsFound: result.patterns.length,
        tokensUsed: result.tokensUsed,
        confidence: result.confidence,
        patterns: result.patterns.map(p => ({
          type: p.type,
          description: p.description,
          exampleText: p.exampleText,
          regexPattern: p.regexPattern,
        }))
      },
      samplePages: pagesText.length
    })
  } catch (error: any) {
    console.error('❌ Erro ao testar detecção de padrões:', error)

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
