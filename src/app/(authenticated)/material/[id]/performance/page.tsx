'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, TrendingUp, Clock, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface HistoricoItem {
  id: string;
  data: string;
  pontuacao: number;
  percentualAcerto: number;
  totalQuestoes: number;
  questoesCorretas: number;
  tempoTotal: number;
  sessaoRealizada: {
    id: string;
    respostasDetalhadas: Array<{
      questao: {
        pergunta: string;
        respostaCorreta: string;
      };
      respostaSelecionada: string;
      correto: boolean;
      tempoSegundos: number;
    }>;
  };
}

export default function PerformancePage() {
  const router = useRouter();
  const params = useParams();
  const materialId = params?.id as string;
  
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistorico() {
      if (!materialId) return;
      
      try {
        const response = await fetch(`/api/material/${materialId}/resultados`);
        
        if (response.ok) {
          const data = await response.json();
          setHistorico(data);
        } else {
          toast.error('Erro ao carregar histórico');
        }
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        toast.error('Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    }

    loadHistorico();
  }, [materialId]);

  const formatarTempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${minutos}m ${secs}s`;
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calcularEstatisticas = () => {
    if (historico.length === 0) return null;

    const melhorPontuacao = Math.max(...historico.map(h => h.percentualAcerto));
    const pontuacaoMedia = historico.reduce((acc, h) => acc + h.percentualAcerto, 0) / historico.length;
    const tempoMedio = historico.reduce((acc, h) => acc + h.tempoTotal, 0) / historico.length;
    const totalQuestoes = historico.reduce((acc, h) => acc + h.totalQuestoes, 0);
    const totalCorretas = historico.reduce((acc, h) => acc + h.questoesCorretas, 0);

    return {
      melhorPontuacao,
      pontuacaoMedia,
      tempoMedio,
      totalQuestoes,
      totalCorretas,
      acertoGeral: totalQuestoes > 0 ? (totalCorretas / totalQuestoes) * 100 : 0,
    };
  };

  const estatisticas = calcularEstatisticas();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
          <div className="text-xl font-semibold">Carregando performance...</div>
        </div>
      </div>
    );
  }

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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Performance & Histórico
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe seu desempenho nos questionários
          </p>
        </div>
      </div>

      {historico.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-muted-foreground text-center mb-6">
              Você ainda não realizou nenhum questionário. Comece respondendo questões para ver sua performance.
            </p>
            <Button onClick={() => router.push(`/material/${materialId}/questionario-interativo`)}>
              <Brain className="h-4 w-4 mr-2" />
              Fazer Questionário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estatísticas Gerais */}
          {estatisticas && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold">{estatisticas.melhorPontuacao.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Melhor Resultado</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{estatisticas.pontuacaoMedia.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Média Geral</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{estatisticas.totalCorretas}</div>
                      <div className="text-xs text-muted-foreground">Questões Certas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">{formatarTempo(Math.round(estatisticas.tempoMedio))}</div>
                      <div className="text-xs text-muted-foreground">Tempo Médio</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Lista de Resultados */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historico.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{historico.length - index}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatarData(item.data)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={
                            item.percentualAcerto >= 80 ? 'bg-green-100 text-green-800' :
                            item.percentualAcerto >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }
                        >
                          {item.percentualAcerto.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Acertos</div>
                        <div className="font-semibold">
                          {item.questoesCorretas}/{item.totalQuestoes}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Tempo</div>
                        <div className="font-semibold">{formatarTempo(item.tempoTotal)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Pontuação</div>
                        <div className="font-semibold">{item.pontuacao.toFixed(1)}</div>
                      </div>
                      <div className="flex items-center">
                        <Progress 
                          value={item.percentualAcerto} 
                          className="h-2 flex-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push(`/material/${materialId}/questionario-interativo`)}
              className="flex-1"
            >
              <Brain className="h-4 w-4 mr-2" />
              Novo Questionário
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push(`/material/${materialId}`)}
            >
              Voltar ao Material
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 