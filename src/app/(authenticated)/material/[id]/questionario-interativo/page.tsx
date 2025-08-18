'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, Clock, Check, X, SkipForward, CheckCircle, XCircle, Target, Trophy, Zap, Star, Flame, Medal, Timer, Sparkles, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Label } from "@/components/ui/label";

interface Questao {
  id: string;
  pergunta: string;
  alternativaA: string;
  alternativaB: string;
  alternativaC: string;
  alternativaD: string;
  alternativaE?: string;
  respostaCorreta: string;
  explicacao?: string;
  nivel?: string;
  topico?: string;
  ordem: number;
  sessao: {
    titulo: string;
    descricao?: string;
  };
}

interface RespostaSessao {
  questaoId: string;
  resposta: string;
  correto: boolean;
  tempoSegundos: number;
}

interface GameStats {
  pontos: number;
  streak: number;
  maxStreak: number;
  bonusVelocidade: number;
  achievements: string[];
  nivel: number;
}

// Componente de Dashboard Minimalista
function DashboardMinimalista({ 
  gameStats,
  corretas, 
  total, 
  questaoAtual,
  tempoQuestao,
  alternativasDescartadas
}: { 
  gameStats: GameStats;
  corretas: number; 
  total: number; 
  questaoAtual: number;
  tempoQuestao: number;
  alternativasDescartadas: number;
}) {
  const percentual = total > 0 ? (corretas / total) * 100 : 0;
  const questoesRespondidas = questaoAtual;
  
  return (
    <Card className="border-gray-200">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{corretas} acertos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{questoesRespondidas - corretas} erros</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>{total - questoesRespondidas} restantes</span>
            </div>
            {alternativasDescartadas > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>{alternativasDescartadas} descartadas</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>{tempoQuestao}s</span>
            </div>
            <div className="text-gray-900 font-medium">
              {percentual.toFixed(0)}% precisão
            </div>
            {gameStats.streak > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Flame className="h-4 w-4" />
                <span>{gameStats.streak}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Feedback Minimalista
function FeedbackMinimalista({ 
  correto, 
  respostaUsuario, 
  respostaCorreta, 
  explicacao,
  questao,
  pontosGanhos,
  streak,
  achievements,
  bonusVelocidade,
  onProxima
}: {
  correto: boolean;
  respostaUsuario: string;
  respostaCorreta: string;
  explicacao?: string;
  questao: Questao;
  pontosGanhos: number;
  streak: number;
  achievements: string[];
  bonusVelocidade: number;
  onProxima: () => void;
}) {
  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          {correto ? (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <X className="h-5 w-5 text-red-600" />
            </div>
          )}
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {correto ? 'Correto' : 'Incorreto'}
            </CardTitle>
            <p className="text-sm text-gray-600">
              {correto 
                ? 'Você acertou esta questão' 
                : `A resposta correta era: ${respostaCorreta}`
              }
            </p>
          </div>
          
          {/* Informações discretas de pontuação */}
          {correto && streak > 1 && (
            <div className="text-right text-sm text-gray-500">
              <div>{streak} seguidas</div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sua resposta (se incorreta) */}
        {!correto && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Sua resposta:</span>
            <div className="text-gray-800 mt-1">
              <span className="font-medium">{respostaUsuario})</span> {questao[`alternativa${respostaUsuario}` as keyof Questao] as string}
            </div>
          </div>
        )}
        
        {/* Resposta correta */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <span className="text-sm font-medium text-green-800">Resposta correta:</span>
          <div className="text-green-900 mt-1 font-medium">
            <span className="font-semibold">{respostaCorreta})</span> {questao[`alternativa${respostaCorreta}` as keyof Questao] as string}
          </div>
        </div>

        {/* Explicação */}
        {explicacao && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-800">Explicação:</span>
            <p className="text-blue-900 mt-1">{explicacao}</p>
          </div>
        )}

        {/* Achievements discretos */}
        {achievements.length > 0 && (
          <div className="text-sm text-gray-600">
            {achievements.map((achievement, index) => (
              <span key={index} className="inline-block mr-2">
                🏆 {achievement}
              </span>
            ))}
          </div>
        )}

        <Button 
          onClick={onProxima}
          className="w-full"
          variant={correto ? "default" : "outline"}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Continuar
        </Button>
      </CardContent>
    </Card>
  );
}

export default function QuestionarioInterativoPage() {
  const router = useRouter();
  const params = useParams();
  const materialId = params?.id as string;
  
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [respostaAtual, setRespostaAtual] = useState('');
  const [respostas, setRespostas] = useState<RespostaSessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondendo, setRespondendo] = useState(false);
  const [tempoInicio, setTempoInicio] = useState<Date | null>(null);
  const [tempoQuestaoInicio, setTempoQuestaoInicio] = useState<Date | null>(null);
  const [finalizado, setFinalizado] = useState(false);
  const [resultados, setResultados] = useState<any>(null);
  
  // Estados para gamificação
  const [gameStats, setGameStats] = useState<GameStats>({
    pontos: 0,
    streak: 0,
    maxStreak: 0,
    bonusVelocidade: 1,
    achievements: [],
    nivel: 1
  });
  
  // Estados para feedback
  const [mostrandoFeedback, setMostrandoFeedback] = useState(false);
  const [feedbackAtual, setFeedbackAtual] = useState<{
    correto: boolean;
    respostaUsuario: string;
    respostaCorreta: string;
    explicacao?: string;
    pontosGanhos: number;
    achievementsNovos: string[];
  } | null>(null);
  
  // Timer para cada questão
  const [tempoQuestao, setTempoQuestao] = useState(0);
  
  // Estado para alternativas descartadas
  const [alternativasDescartadas, setAlternativasDescartadas] = useState<string[]>([]);

  // Função para embaralhar array (evitar questões repetidas)
  const embaralharArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    async function loadQuestoes() {
      if (!materialId) return;
      
      try {
        const response = await fetch(`/api/questoes/material/${materialId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            // Embaralhar questões para evitar repetições
            const questoesEmbaralhadas = embaralharArray(data);
            setQuestoes(questoesEmbaralhadas);
            setTempoInicio(new Date());
            setTempoQuestaoInicio(new Date());
          } else {
            toast.error('Nenhuma questão encontrada para este material');
            router.push(`/material/${materialId}`);
          }
        } else {
          toast.error('Erro ao carregar questões');
          router.push(`/material/${materialId}`);
        }
      } catch (error) {
        console.error('Erro ao carregar questões:', error);
        toast.error('Erro ao carregar questões');
        router.push(`/material/${materialId}`);
      } finally {
        setLoading(false);
      }
    }

    loadQuestoes();
  }, [materialId, router]);

  // Timer para cada questão
  useEffect(() => {
    if (!tempoQuestaoInicio || mostrandoFeedback) return;
    
    const interval = setInterval(() => {
      const agora = new Date();
      const diferenca = Math.floor((agora.getTime() - tempoQuestaoInicio.getTime()) / 1000);
      setTempoQuestao(diferenca);
    }, 1000);

    return () => clearInterval(interval);
  }, [tempoQuestaoInicio, mostrandoFeedback]);

  const calcularTempoResposta = () => {
    if (!tempoQuestaoInicio) return 0;
    return Math.floor((new Date().getTime() - tempoQuestaoInicio.getTime()) / 1000);
  };

  // Lógica de pontuação e achievements
  const calcularPontuacaoEAchievements = (correto: boolean, tempoResposta: number, streakAtual: number) => {
    let pontosGanhos = 0;
    let novoStreak = streakAtual;
    let bonusVelocidade = 1;
    let achievements: string[] = [];

    if (correto) {
      // Pontos base
      pontosGanhos = 100;
      novoStreak = streakAtual + 1;

      // Bônus por velocidade (menos de 10s = 2x, menos de 5s = 3x)
      if (tempoResposta < 5) {
        bonusVelocidade = 3;
        pontosGanhos *= 3;
      } else if (tempoResposta < 10) {
        bonusVelocidade = 2;
        pontosGanhos *= 2;
      }

      // Bônus por streak
      if (novoStreak >= 5) {
        pontosGanhos += 500;
      } else if (novoStreak >= 3) {
        pontosGanhos += 200;
      }

      // Achievements
      if (novoStreak === 3) achievements.push('Tripla Conquista');
      if (novoStreak === 5) achievements.push('Sequência de Ouro');
      if (novoStreak === 10) achievements.push('Mestre dos Acertos');
      if (tempoResposta < 3) achievements.push('Raio Veloz');
      if (pontosGanhos >= 500) achievements.push('Pontuação Épica');
    } else {
      novoStreak = 0;
    }

    return { pontosGanhos, novoStreak, bonusVelocidade, achievements };
  };

  const responderQuestao = async () => {
    if (!respostaAtual) {
      toast.error('Selecione uma resposta antes de continuar');
      return;
    }

    setRespondendo(true);
    const questao = questoes[questaoAtual];
    const tempoResposta = calcularTempoResposta();
    const correto = respostaAtual === questao.respostaCorreta;

    const novaResposta: RespostaSessao = {
      questaoId: questao.id,
      resposta: respostaAtual,
      correto,
      tempoSegundos: tempoResposta,
    };

    const novasRespostas = [...respostas, novaResposta];
    setRespostas(novasRespostas);

    // Calcular pontuação e achievements
    const { pontosGanhos, novoStreak, bonusVelocidade, achievements } = 
      calcularPontuacaoEAchievements(correto, tempoResposta, gameStats.streak);

    // Atualizar game stats
    const novosGameStats: GameStats = {
      pontos: gameStats.pontos + pontosGanhos,
      streak: novoStreak,
      maxStreak: Math.max(gameStats.maxStreak, novoStreak),
      bonusVelocidade,
      achievements: [...gameStats.achievements, ...achievements],
      nivel: Math.floor((gameStats.pontos + pontosGanhos) / 1000) + 1
    };
    setGameStats(novosGameStats);

    // Mostrar feedback
    setFeedbackAtual({
      correto,
      respostaUsuario: respostaAtual,
      respostaCorreta: questao.respostaCorreta,
      explicacao: questao.explicacao,
      pontosGanhos,
      achievementsNovos: achievements
    });
    setMostrandoFeedback(true);
    setRespondendo(false);
  };

  const proximaQuestao = async () => {
    setMostrandoFeedback(false);
    setFeedbackAtual(null);
    
    // Se é a última questão, finaliza
    if (questaoAtual === questoes.length - 1) {
      await finalizarQuestionario(respostas);
    } else {
      // Próxima questão
      setQuestaoAtual(prev => prev + 1);
      setRespostaAtual('');
      setTempoQuestaoInicio(new Date());
      setTempoQuestao(0);
      // Limpar alternativas descartadas para nova questão
      setAlternativasDescartadas([]);
    }
  };

  // Função para descartar alternativa (duplo clique)
  const descartarAlternativa = (letra: string) => {
    if (alternativasDescartadas.includes(letra)) {
      // Se já está descartada, reativar
      setAlternativasDescartadas(prev => prev.filter(alt => alt !== letra));
    } else {
      // Descartar alternativa
      setAlternativasDescartadas(prev => [...prev, letra]);
      // Se era a resposta selecionada, limpar seleção
      if (respostaAtual === letra) {
        setRespostaAtual('');
      }
    }
  };

  const finalizarQuestionario = async (respostasFinais: RespostaSessao[]) => {
    try {
      const tempoTotal = tempoInicio ? Math.floor((new Date().getTime() - tempoInicio.getTime()) / 1000) : 0;
      const corretas = respostasFinais.filter(r => r.correto).length;
      const percentual = (corretas / questoes.length) * 100;

      const resultado = {
        totalQuestoes: questoes.length,
        questoesCorretas: corretas,
        questoesIncorretas: questoes.length - corretas,
        percentualAcerto: percentual,
        tempoTotalSegundos: tempoTotal,
        respostas: respostasFinais,
      };

      // Salvar resultado na API
      const response = await fetch(`/api/material/${materialId}/resultados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resultado),
      });

      if (response.ok) {
        const data = await response.json();
        setResultados(data);
        setFinalizado(true);
        toast.success('Questionário finalizado!');
      } else {
        toast.error('Erro ao salvar resultados');
      }
    } catch (error) {
      console.error('Erro ao finalizar questionário:', error);
      toast.error('Erro ao finalizar questionário');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Brain className="h-6 w-6 text-gray-600 animate-pulse" />
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-2">
            Carregando questionário
          </div>
          <div className="text-gray-600">Aguarde um momento...</div>
        </div>
      </div>
    );
  }

  if (questoes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <div className="text-xl font-semibold mb-2">Nenhuma questão disponível</div>
          <p className="text-muted-foreground mb-4">
            Este material ainda não possui questões. Gere questões primeiro.
          </p>
          <Button onClick={() => router.push(`/material/${materialId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Material
          </Button>
        </div>
      </div>
    );
  }

  if (finalizado && resultados) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/material/${materialId}`)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Questionário Finalizado!
            </h1>
            <p className="text-sm text-muted-foreground">Seus resultados</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {resultados.percentualAcerto?.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Taxa de Acerto</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{resultados.questoesCorretas}</div>
                  <div className="text-xs text-muted-foreground">Corretas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{resultados.questoesIncorretas}</div>
                  <div className="text-xs text-muted-foreground">Incorretas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{resultados.totalQuestoes}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Tempo Total: {Math.floor(resultados.tempoTotalSegundos / 60)}m {resultados.tempoTotalSegundos % 60}s</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Refazer Questionário
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push(`/material/${materialId}`)}
              >
                Voltar ao Material
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const questao = questoes[questaoAtual];
  const progresso = ((questaoAtual + 1) / questoes.length) * 100;
  const questoesCorretas = respostas.filter(r => r.correto).length;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/material/${materialId}`)}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Questionário Interativo</h1>
          <p className="text-sm text-muted-foreground">
            Questão {questaoAtual + 1} de {questoes.length}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Progresso</div>
          <div className="text-lg font-semibold">{Math.round(progresso)}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progresso} className="h-3" />

      {/* Dashboard Minimalista */}
      <DashboardMinimalista 
        gameStats={gameStats}
        corretas={questoesCorretas}
        total={questoes.length}
        questaoAtual={questaoAtual + 1}
        tempoQuestao={tempoQuestao}
        alternativasDescartadas={alternativasDescartadas.length}
      />

      {/* Feedback ou Questão */}
      {mostrandoFeedback && feedbackAtual ? (
        <FeedbackMinimalista
          correto={feedbackAtual.correto}
          respostaUsuario={feedbackAtual.respostaUsuario}
          respostaCorreta={feedbackAtual.respostaCorreta}
          explicacao={feedbackAtual.explicacao}
          questao={questao}
          pontosGanhos={feedbackAtual.pontosGanhos}
          streak={gameStats.streak}
          achievements={feedbackAtual.achievementsNovos}
          bonusVelocidade={gameStats.bonusVelocidade}
          onProxima={proximaQuestao}
        />
      ) : (
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-gray-600">
                  Questão {questaoAtual + 1}
                </Badge>
                {questao.nivel && (
                  <Badge variant="secondary">
                    {questao.nivel}
                  </Badge>
                )}
                {questao.topico && (
                  <Badge variant="outline">
                    {questao.topico}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{tempoQuestao}s</span>
              </div>
            </div>
            <CardTitle className="text-xl leading-relaxed text-gray-900">
              {questao.pergunta}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {['A', 'B', 'C', 'D', 'E'].map((letra) => {
                const alternativa = questao[`alternativa${letra}` as keyof Questao] as string;
                if (!alternativa) return null;
                
                const isDescartada = alternativasDescartadas.includes(letra);
                const isSelecionada = respostaAtual === letra;
                
                return (
                  <div 
                    key={letra} 
                    className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all relative ${
                      isDescartada 
                        ? 'border-red-200 bg-red-50/30 opacity-60'
                        : isSelecionada 
                          ? 'border-gray-900 bg-gray-50' 
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => !respondendo && !isDescartada && setRespostaAtual(letra)}
                    onDoubleClick={() => !respondendo && descartarAlternativa(letra)}
                    title={isDescartada ? "Clique duplo para reativar" : "Clique duplo para descartar"}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-sm font-medium ${
                      isDescartada
                        ? 'border-red-300 bg-red-100 text-red-600'
                        : isSelecionada 
                          ? 'border-gray-900 bg-gray-900 text-white' 
                          : 'border-gray-300 text-gray-600'
                    }`}>
                      {isDescartada ? '✕' : letra}
                    </div>
                    <Label 
                      htmlFor={`alternativa-${letra}`} 
                      className={`flex-1 cursor-pointer leading-relaxed ${
                        isDescartada 
                          ? 'text-gray-500 line-through' 
                          : 'text-gray-800'
                      }`}
                    >
                      {alternativa}
                    </Label>
                    {isDescartada && (
                      <div className="text-xs text-red-500 font-medium">
                        Descartada
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dica sobre descartar alternativas */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs">i</span>
                </div>
                <div className="text-sm text-blue-800">
                  <strong>Dica:</strong> Clique duplo em uma alternativa para descartá-la. 
                  Isso ajuda a focar nas opções que considera corretas.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                {respostas.length} de {questoes.length} questões
              </div>
              <Button 
                onClick={responderQuestao}
                disabled={!respostaAtual || respondendo}
                className="px-6"
              >
                {respondendo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Responder
                  </>
                )}
              </Button>
              
              {/* Botão para limpar alternativas descartadas */}
              {alternativasDescartadas.length > 0 && (
                <Button 
                  onClick={() => setAlternativasDescartadas([])}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Restaurar todas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 