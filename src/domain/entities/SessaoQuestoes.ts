export interface SessaoQuestoes {
  id: string
  materialId?: string
  disciplinaId?: string
  titulo: string
  descricao?: string
  prompt: string
  totalQuestoes: number
  createdAt: Date
  updatedAt: Date
  questoes?: QuestaoSalva[]
}

export interface QuestaoSalva {
  id: string
  sessaoId: string
  pergunta: string
  alternativaA: string
  alternativaB: string
  alternativaC: string
  alternativaD: string
  alternativaE?: string
  respostaCorreta: string
  explicacao?: string
  nivel?: string
  topico?: string
  ordem: number
  createdAt: Date
  updatedAt: Date
  respostas?: RespostaUsuario[]
}

export interface RespostaUsuario {
  id: string
  questaoId: string
  resposta: string
  correto: boolean
  tempoGasto?: number
  createdAt: Date
}

export interface CriarSessaoQuestoesRequest {
  materialId?: string
  disciplinaId?: string
  titulo: string
  descricao?: string
  prompt: string
  questoes: QuestaoParaSalvar[]
}

export interface QuestaoParaSalvar {
  pergunta: string
  alternativaA: string
  alternativaB: string
  alternativaC: string
  alternativaD: string
  alternativaE?: string
  respostaCorreta: string
  explicacao?: string
  nivel?: string
  topico?: string
  ordem: number
}

export interface SalvarRespostaRequest {
  questaoId: string
  resposta: string
  tempoGasto?: number
}

export interface EstatisticasSessao {
  sessaoId: string
  totalQuestoes: number
  questoesRespondidas: number
  acertos: number
  erros: number
  tempoTotalGasto: number
  percentualAcerto: number
} 