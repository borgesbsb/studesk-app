import { Questao, QuestaoRequest, QuestaoResponse } from '@/domain/entities/Questao'

export async function generateQuestionsForParagraphs(paragraphs: string[]): Promise<Questao[]> {
  // Implementação simulada para teste
  const generateSimulatedQuestion = (index: number, text: string): Questao => ({
    id: Math.random().toString(36).substring(7),
    enunciado: `Questão ${index + 1}: Com base no texto, analise a seguinte afirmação: "${text.substring(0, 100)}..."`,
    paragrafoPai: text,
    alternativas: [
      {
        id: '1',
        texto: `Esta é a alternativa correta da questão ${index + 1}`,
        correta: true,
        explicacao: 'Esta alternativa está correta pois corresponde ao conteúdo do texto.'
      },
      {
        id: '2',
        texto: `Esta é uma alternativa incorreta da questão ${index + 1}`,
        correta: false
      },
      {
        id: '3',
        texto: `Esta é outra alternativa incorreta da questão ${index + 1}`,
        correta: false
      },
      {
        id: '4',
        texto: `Esta também é uma alternativa incorreta da questão ${index + 1}`,
        correta: false
      }
    ]
  })

  // Gera 5 questões para cada parágrafo
  return paragraphs.flatMap(text => 
    Array.from({ length: 5 }, (_, i) => generateSimulatedQuestion(i, text))
  )
} 