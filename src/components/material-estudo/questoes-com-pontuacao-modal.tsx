'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Trophy,
  Timer,
  Target,
  PlayCircle,
  StopCircle,
  Star,
  TrendingUp,
  Award,
  BookOpen
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface QuestaoOpenAI {
  id?: string
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
}

interface QuestoesComPontuacaoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questoes: QuestaoOpenAI[]
  sessaoId?: string
  materialId?: string
  isAdaptativo?: boolean
  onProgresso?: (progresso: any) => void
}

interface ResultadoFinal {
  pontuacao: number
  percentualAcerto: number
  questoesCorretas: number
  questoesIncorretas: number
  questoesNaoRespondidas: number
  tempoTotal: number
  respostasDetalhadas: any[]
}

export function QuestoesComPontuacaoModal({ 
  open, 
  onOpenChange, 
  questoes: questoesProp, 
  sessaoId,
  materialId,
  isAdaptativo = false,
  onProgresso
}: QuestoesComPontuacaoModalProps) {
  const [questoes, setQuestoes] = useState<QuestaoOpenAI[]>(questoesProp || [])
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [sessaoRealizadaId, setSessaoRealizadaId] = useState<string | null>(null)
  const [tempoInicio, setTempoInicio] = useState<Date | null>(null)
  const [tempoAtual, setTempoAtual] = useState<Date>(new Date())
  const [temposPorQuestao, setTemposPorQuestao] = useState<Record<number, Date>>({})
  const [sessaoIniciada, setSessaoIniciada] = useState(false)
  const [sessaoFinalizada, setSessaoFinalizada] = useState(false)
  const [resultadoFinal, setResultadoFinal] = useState<ResultadoFinal | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Carregar questões se apenas sessaoId foi fornecido
  useEffect(() => {
    if (open && sessaoId && (!questoesProp || questoesProp.length === 0)) {
      carregarQuestoesSessao()
    } else if (questoesProp && questoesProp.length > 0) {
      setQuestoes(questoesProp)
    }
  }, [open, sessaoId, questoesProp])

  const carregarQuestoesSessao = async () => {
    if (!sessaoId) return

    setCarregandoQuestoes(true)
    try {
      const response = await fetch(`/api/sessoes-questoes/${sessaoId}`)
      const result = await response.json()

      if (result.success && result.data.questoes) {
        const questoesFormatadas = result.data.questoes.map((q: any) => ({
          id: q.id,
          pergunta: q.pergunta,
          alternativaA: q.alternativaA,
          alternativaB: q.alternativaB,
          alternativaC: q.alternativaC,
          alternativaD: q.alternativaD,
          alternativaE: q.alternativaE,
          respostaCorreta: q.respostaCorreta,
          explicacao: q.explicacao,
          nivel: q.nivel,
          topico: q.topico
        }))
        setQuestoes(questoesFormatadas)
      } else {
        toast.error('Erro ao carregar questões da sessão')
      }
    } catch (error) {
      console.error('Erro ao carregar questões:', error)
      toast.error('Erro ao carregar questões')
    } finally {
      setCarregandoQuestoes(false)
    }
  }

  const currentQuestion = questoes[currentQuestionIndex]
  const totalQuestions = questoes.length

  // Atualizar tempo a cada segundo
  useEffect(() => {
    if (sessaoIniciada && !sessaoFinalizada) {
      const interval = setInterval(() => {
        setTempoAtual(new Date())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [sessaoIniciada, sessaoFinalizada])

  // Marcar tempo quando muda de questão
  useEffect(() => {
    if (sessaoIniciada && !temposPorQuestao[currentQuestionIndex]) {
      setTemposPorQuestao(prev => ({
        ...prev,
        [currentQuestionIndex]: new Date()
      }))
    }
  }, [currentQuestionIndex, sessaoIniciada])

  const iniciarSessao = async () => {
    if (!sessaoId) {
      toast.error('ID da sessão não encontrado')
      return
    }

    try {
      setCarregando(true)
      
      const response = await fetch('/api/pontuacao/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessaoQuestoesId: sessaoId })
      })

      const data = await response.json()

      if (data.success) {
        setSessaoRealizadaId(data.data.id)
        setTempoInicio(new Date())
        setSessaoIniciada(true)
        setTemposPorQuestao({ [0]: new Date() })
        toast.success('Sessão iniciada! Boa sorte! 🍀')
      } else {
        throw new Error(data.message || 'Erro ao iniciar sessão')
      }
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
      toast.error('Erro ao iniciar sessão de pontuação')
    } finally {
      setCarregando(false)
    }
  }

  const finalizarSessao = async () => {
    if (!sessaoRealizadaId || !tempoInicio) return

    try {
      setCarregando(true)
      
      const tempoTotal = Math.floor((tempoAtual.getTime() - tempoInicio.getTime()) / 1000)
      
      // Preparar respostas com tempo gasto em cada questão
      const respostas = questoes.map((questao, index) => {
        const tempoInicioQuestao = temposPorQuestao[index]
        const tempoFimQuestao = temposPorQuestao[index + 1] || tempoAtual
        const tempoQuestao = tempoInicioQuestao 
          ? Math.floor((tempoFimQuestao.getTime() - tempoInicioQuestao.getTime()) / 1000)
          : 0

        return {
          questaoId: questao.id || `temp-${index}`,
          respostaSelecionada: selectedAnswers[index] || null,
          tempoSegundos: tempoQuestao,
          ordem: index + 1
        }
      })

      const response = await fetch('/api/pontuacao/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessaoRealizadaId,
          respostas,
          tempoTotalSegundos: tempoTotal
        })
      })

      const data = await response.json()

      if (data.success) {
        const resultado = data.data
        setResultadoFinal({
          pontuacao: resultado.pontuacao,
          percentualAcerto: resultado.percentualAcerto,
          questoesCorretas: resultado.questoesCorretas,
          questoesIncorretas: resultado.questoesIncorretas,
          questoesNaoRespondidas: resultado.questoesNaoRespondidas,
          tempoTotal,
          respostasDetalhadas: resultado.respostasDetalhadas
        })
        setSessaoFinalizada(true)
        
        // Se for modo adaptativo, atualizar progresso
        if (isAdaptativo && materialId) {
          try {
            const progressoResponse = await fetch(`/api/progresso-adaptativo/${materialId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pontuacao: resultado.pontuacao,
                percentualAcerto: resultado.percentualAcerto
              })
            })
            
            const progressoData = await progressoResponse.json()
            if (progressoData.success && onProgresso) {
              onProgresso(progressoData.data)
            }
          } catch (error) {
            console.error('Erro ao atualizar progresso:', error)
          }
        }
        
        // Toast com resultado
        const emoji = resultado.percentualAcerto >= 80 ? '🎉' : 
                     resultado.percentualAcerto >= 60 ? '👏' : '💪'
        toast.success(`Sessão finalizada! ${emoji} Pontuação: ${resultado.pontuacao.toFixed(1)}`)
      } else {
        throw new Error(data.message || 'Erro ao finalizar sessão')
      }
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
      toast.error('Erro ao finalizar sessão')
    } finally {
      setCarregando(false)
    }
  }

  const formatarTempo = (inicio: Date, fim: Date = tempoAtual) => {
    const segundos = Math.floor((fim.getTime() - inicio.getTime()) / 1000)
    const minutos = Math.floor(segundos / 60)
    const segsRestantes = segundos % 60
    return `${minutos.toString().padStart(2, '0')}:${segsRestantes.toString().padStart(2, '0')}`
  }

  const tempoDecorrido = tempoInicio ? formatarTempo(tempoInicio) : '00:00'
  const progressoResposta = (Object.keys(selectedAnswers).length / totalQuestions) * 100

  if (!currentQuestion) return null

  const alternativas = [
    { letra: 'A', texto: currentQuestion.alternativaA },
    { letra: 'B', texto: currentQuestion.alternativaB },
    { letra: 'C', texto: currentQuestion.alternativaC },
    { letra: 'D', texto: currentQuestion.alternativaD },
  ]

  if (currentQuestion.alternativaE) {
    alternativas.push({ letra: 'E', texto: currentQuestion.alternativaE })
  }

  const handleSelectAnswer = (letra: string) => {
    if (sessaoIniciada && !sessaoFinalizada) {
      setSelectedAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: letra
      }))
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const obterCorAlternativa = (letra: string) => {
    if (!sessaoFinalizada) {
      return selectedAnswers[currentQuestionIndex] === letra ? 'border-primary bg-primary/10' : ''
    }
    
    // Após finalizar, mostrar cores baseadas nas respostas
    const respostaSelecionada = selectedAnswers[currentQuestionIndex]
    const respostaCorreta = currentQuestion.respostaCorreta
    
    if (letra === respostaCorreta) {
      return 'border-green-500 bg-green-50 text-green-900'
    }
    if (letra === respostaSelecionada && letra !== respostaCorreta) {
      return 'border-red-500 bg-red-50 text-red-900'
    }
    return ''
  }

  // Renderizar tela de resultado final
  if (sessaoFinalizada && resultadoFinal) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Resultado Final
            </DialogTitle>
            <DialogDescription>
              Parabéns! Você completou a sessão de questões.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Pontuação Principal */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-primary">
                      {resultadoFinal.pontuacao.toFixed(1)}
                    </div>
                    <div className="text-lg text-muted-foreground">pontos</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="font-medium">Percentual de Acerto</div>
                      <div className="text-2xl font-bold text-green-600">
                        {resultadoFinal.percentualAcerto.toFixed(1)}%
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Tempo Total</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.floor(resultadoFinal.tempoTotal / 60)}min {resultadoFinal.tempoTotal % 60}s
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas Detalhadas */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {resultadoFinal.questoesCorretas}
                  </div>
                  <div className="text-sm text-muted-foreground">Corretas</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4 text-center">
                  <X className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">
                    {resultadoFinal.questoesIncorretas}
                  </div>
                  <div className="text-sm text-muted-foreground">Incorretas</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4 text-center">
                  <Timer className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-600">
                    {resultadoFinal.questoesNaoRespondidas}
                  </div>
                  <div className="text-sm text-muted-foreground">Não Resp.</div>
                </CardContent>
              </Card>
            </div>

            {/* Badge de Performance */}
            <div className="text-center">
              {resultadoFinal.percentualAcerto >= 90 && (
                <Badge className="bg-yellow-500 text-white text-lg py-2 px-4">
                  <Star className="h-4 w-4 mr-2" />
                  Excelente Performance!
                </Badge>
              )}
              {resultadoFinal.percentualAcerto >= 70 && resultadoFinal.percentualAcerto < 90 && (
                <Badge className="bg-green-500 text-white text-lg py-2 px-4">
                  <Award className="h-4 w-4 mr-2" />
                  Boa Performance!
                </Badge>
              )}
              {resultadoFinal.percentualAcerto >= 50 && resultadoFinal.percentualAcerto < 70 && (
                <Badge className="bg-blue-500 text-white text-lg py-2 px-4">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Continue Estudando!
                </Badge>
              )}
              {resultadoFinal.percentualAcerto < 50 && (
                <Badge className="bg-orange-500 text-white text-lg py-2 px-4">
                  <Target className="h-4 w-4 mr-2" />
                  Foque nos Estudos!
                </Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  setSessaoFinalizada(false)
                  setResultadoFinal(null)
                  setSessaoIniciada(false)
                  setSelectedAnswers({})
                  setCurrentQuestionIndex(0)
                }}
                className="flex-1"
              >
                Nova Tentativa
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Questões com Pontuação
          </DialogTitle>
          <DialogDescription>
            {!sessaoIniciada 
              ? `${totalQuestions} questões preparadas. Clique em "Iniciar" para começar!`
              : `Questão ${currentQuestionIndex + 1} de ${totalQuestions} • Tempo: ${tempoDecorrido}`
            }
          </DialogDescription>
        </DialogHeader>

        {carregandoQuestoes ? (
          // Tela de carregamento
          <div className="text-center space-y-6 py-8">
            <div className="space-y-4">
              <div className="animate-spin mx-auto">
                <BookOpen className="h-16 w-16 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Carregando Questões...</h3>
                <p className="text-muted-foreground mt-2">
                  Preparando sua sessão de treinamento.
                </p>
              </div>
            </div>
          </div>
        ) : !sessaoIniciada ? (
          // Tela inicial
          <div className="text-center space-y-6 py-8">
            <div className="space-y-4">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold">Pronto para o Desafio?</h3>
                <p className="text-muted-foreground mt-2">
                  Responda às questões e ganhe pontos baseados na sua performance!
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Como funciona a pontuação:</h4>
              <div className="text-sm space-y-1 text-left max-w-md mx-auto">
                <div className="flex justify-between">
                  <span>✅ Resposta correta:</span>
                  <span className="font-medium text-green-600">+10 pontos</span>
                </div>
                <div className="flex justify-between">
                  <span>❌ Resposta incorreta:</span>
                  <span className="font-medium text-red-600">-2 pontos</span>
                </div>
                <div className="flex justify-between">
                  <span>⏭️ Não respondida:</span>
                  <span className="font-medium text-gray-600">0 pontos</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={iniciarSessao} 
              disabled={carregando || totalQuestions === 0}
              size="lg"
              className="px-8"
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              {carregando ? 'Iniciando...' : 'Iniciar Sessão'}
            </Button>
          </div>
        ) : (
          // Tela de questões
          <div className="space-y-6">
            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso das Questões</span>
                <span>{currentQuestionIndex + 1} / {totalQuestions}</span>
              </div>
              <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} />
            </div>

            {/* Status Bar */}
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  <span>{tempoDecorrido}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span>{Object.keys(selectedAnswers).length} respondidas</span>
                </div>
              </div>
              
              <Button 
                onClick={finalizarSessao}
                disabled={carregando}
                variant="destructive"
                size="sm"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                {carregando ? 'Finalizando...' : 'Finalizar'}
              </Button>
            </div>

            {/* Questão Atual */}
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    Questão {currentQuestionIndex + 1}
                  </h3>
                  <p className="text-base leading-relaxed">
                    {currentQuestion.pergunta}
                  </p>
                  {currentQuestion.nivel && (
                    <Badge variant="outline">
                      Nível: {currentQuestion.nivel}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Alternativas:</h4>
                  <div className="space-y-2">
                    {alternativas.map((alt) => (
                      <button
                        key={alt.letra}
                        onClick={() => handleSelectAnswer(alt.letra)}
                        disabled={!sessaoIniciada || sessaoFinalizada}
                        className={cn(
                          "w-full text-left p-4 rounded-lg border-2 transition-all",
                          "hover:border-primary/50 disabled:cursor-not-allowed",
                          obterCorAlternativa(alt.letra)
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-semibold text-primary">
                            {alt.letra})
                          </span>
                          <span className="flex-1">{alt.texto}</span>
                          {selectedAnswers[currentQuestionIndex] === alt.letra && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mostrar explicação após finalizar */}
                {sessaoFinalizada && currentQuestion.explicacao && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Explicação:</h5>
                    <p className="text-blue-800">{currentQuestion.explicacao}</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Navegação */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <div className="text-sm text-muted-foreground">
                {selectedAnswers[currentQuestionIndex] ? (
                  <Badge variant="secondary">
                    Respondida: {selectedAnswers[currentQuestionIndex]}
                  </Badge>
                ) : (
                  <span>Selecione uma alternativa</span>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === totalQuestions - 1}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 