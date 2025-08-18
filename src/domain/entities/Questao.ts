export interface Questao {
  id?: string
  enunciado: string
  alternativas: Alternativa[]
  explicacao?: string
  paragrafoPai: string // Texto do parágrafo que gerou a questão
}

export interface Alternativa {
  id?: string
  texto: string
  correta: boolean
  explicacao?: string
}

export interface QuestaoRequest {
  paragrafo: string
  contexto?: string // Contexto adicional para ajudar na geração
  tipo: 'multipla_escolha' | 'verdadeiro_falso'
  quantidade: number
  promptPersonalizado?: string // Instruções adicionais para personalizar a geração de questões
  prompt?: string // Prompt completo para enviar à OpenAI
}

export interface QuestaoResponse {
  questoes: Questao[]
  status: 'success' | 'error'
  message?: string
  error?: string // Campo para armazenar mensagens de erro específicas
} 