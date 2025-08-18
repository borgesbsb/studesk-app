'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  createdAt: string;
  sessao: {
    titulo: string;
    descricao?: string;
  };
}

interface MaterialData {
  id: string;
  nome: string;
}

const nivelColors = {
  FACIL: 'bg-green-100 text-green-800',
  MEDIO: 'bg-yellow-100 text-yellow-800',
  DIFICIL: 'bg-red-100 text-red-800',
};

const nivelLabels = {
  FACIL: 'Fácil',
  MEDIO: 'Médio',
  DIFICIL: 'Difícil',
};

export default function GerenciarQuestoesPage() {
  const router = useRouter();
  const params = useParams();
  const materialId = params?.id as string;
  
  const [material, setMaterial] = useState<MaterialData | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [loading, setLoading] = useState(true);
  const [questaoParaExcluir, setQuestaoParaExcluir] = useState<Questao | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [infoQuestaoExclusao, setInfoQuestaoExclusao] = useState<any>(null);
  const [carregandoInfo, setCarregandoInfo] = useState(false);
  const [questoesExpandidas, setQuestoesExpandidas] = useState<Set<string>>(new Set());
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<Set<string>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!materialId) return;
      
      try {
        // Carregar material
        const materialResponse = await fetch(`/api/material/${materialId}`);
        const materialData = await materialResponse.json();
        
        if (materialData.material) {
          setMaterial(materialData.material);
        }

        // Carregar questões
        const questoesResponse = await fetch(`/api/questoes/material/${materialId}`);
        
        if (questoesResponse.ok) {
          const questoesData = await questoesResponse.json();
          if (Array.isArray(questoesData)) {
            console.log('📊 Questões carregadas:', questoesData.length);
            console.log('📊 IDs das questões:', questoesData.map(q => q.id));
            setQuestoes(questoesData);
          }
        } else {
          console.error('❌ Erro ao carregar questões:', questoesResponse.status);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [materialId]);

  const abrirModalExclusao = async (questao: Questao) => {
    setQuestaoParaExcluir(questao);
    setCarregandoInfo(true);
    
    try {
      const response = await fetch(`/api/questoes/${questao.id}`);
      if (response.ok) {
        const info = await response.json();
        console.log('📊 Info questão recebida:', info);
        
        // Garantir que _count existe
        if (!info._count) {
          info._count = {
            respostas: 0,
            respostasDetalhadas: 0
          };
        }
        
        setInfoQuestaoExclusao(info);
      }
    } catch (error) {
      console.error('Erro ao carregar informações da questão:', error);
    } finally {
      setCarregandoInfo(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!questaoParaExcluir) return;

    setExcluindo(true);
    try {
      console.log('🗑️ Tentando excluir questão:', questaoParaExcluir.id);
      const response = await fetch(`/api/questoes/${questaoParaExcluir.id}`, {
        method: 'DELETE',
      });

      console.log('📊 Response status:', response.status);

      if (response.ok) {
        setQuestoes(prev => prev.filter(q => q.id !== questaoParaExcluir.id));
        toast.success('Questão excluída com sucesso');
        setQuestaoParaExcluir(null);
        setInfoQuestaoExclusao(null);
      } else {
        let errorMessage = 'Erro ao excluir questão';
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } else {
            // Se não for JSON, usar o status text
            errorMessage = `Erro ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta:', parseError);
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Erro ao excluir questão:', error);
      toast.error('Erro ao excluir questão');
    } finally {
      setExcluindo(false);
    }
  };

  const toggleQuestaoExpandida = (questaoId: string) => {
    const novasExpandidas = new Set(questoesExpandidas);
    if (novasExpandidas.has(questaoId)) {
      novasExpandidas.delete(questaoId);
    } else {
      novasExpandidas.add(questaoId);
    }
    setQuestoesExpandidas(novasExpandidas);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleSelecaoQuestao = (questaoId: string) => {
    const novasSelecionadas = new Set(questoesSelecionadas);
    if (novasSelecionadas.has(questaoId)) {
      novasSelecionadas.delete(questaoId);
    } else {
      novasSelecionadas.add(questaoId);
    }
    setQuestoesSelecionadas(novasSelecionadas);
  };

  const selecionarTodas = () => {
    if (questoesSelecionadas.size === questoes.length) {
      setQuestoesSelecionadas(new Set());
    } else {
      setQuestoesSelecionadas(new Set(questoes.map(q => q.id)));
    }
  };

  const excluirSelecionadas = async () => {
    if (questoesSelecionadas.size === 0) return;

    setExcluindo(true);
    let sucessos = 0;
    let erros = 0;

    for (const questaoId of questoesSelecionadas) {
      try {
        console.log('🗑️ Excluindo questão em lote:', questaoId);
        const response = await fetch(`/api/questoes/${questaoId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          sucessos++;
        } else {
          console.error(`❌ Erro ao excluir questão ${questaoId}:`, response.status);
          erros++;
        }
      } catch (error) {
        console.error(`❌ Erro ao excluir questão ${questaoId}:`, error);
        erros++;
      }
    }

    // Atualizar lista
    setQuestoes(prev => prev.filter(q => !questoesSelecionadas.has(q.id)));
    setQuestoesSelecionadas(new Set());
    setModoSelecao(false);

    if (sucessos > 0) {
      toast.success(`${sucessos} questão(ões) excluída(s) com sucesso`);
    }
    if (erros > 0) {
      toast.error(`Erro ao excluir ${erros} questão(ões)`);
    }

    setExcluindo(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
          <div className="text-xl font-semibold">Carregando questões...</div>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Material não encontrado</div>
          <Button onClick={() => router.push(`/material/${materialId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
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
            <Brain className="h-6 w-6 text-primary" />
            Gerenciar Questões
          </h1>
          <p className="text-sm text-muted-foreground">
            {material.nome} • {questoes.length} questão(ões)
          </p>
        </div>
        {questoes.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {modoSelecao ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {questoesSelecionadas.size} selecionada(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selecionarTodas}
                >
                  {questoesSelecionadas.size === questoes.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={excluirSelecionadas}
                  disabled={questoesSelecionadas.size === 0 || excluindo}
                >
                  {excluindo ? 'Excluindo...' : `Excluir ${questoesSelecionadas.size}`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setModoSelecao(false);
                    setQuestoesSelecionadas(new Set());
                  }}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModoSelecao(true)}
              >
                Selecionar Múltiplas
              </Button>
            )}
          </div>
        )}
      </div>

      {questoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma questão encontrada
            </h3>
            <p className="text-muted-foreground text-center mb-6">
              Este material ainda não possui questões. Use a funcionalidade "Extrair Texto e Gerar Questões" na página do material.
            </p>
            <Button onClick={() => router.push(`/material/${materialId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {questoes.map((questao, index) => {
            const isExpanded = questoesExpandidas.has(questao.id);
            
            return (
              <Card key={questao.id}>
                                 <CardHeader>
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-2">
                         {modoSelecao && (
                           <input
                             type="checkbox"
                             checked={questoesSelecionadas.has(questao.id)}
                             onChange={() => toggleSelecaoQuestao(questao.id)}
                             className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                           />
                         )}
                         <Badge variant="outline">#{index + 1}</Badge>
                        {questao.nivel && (
                          <Badge className={nivelColors[questao.nivel as keyof typeof nivelColors]}>
                            {nivelLabels[questao.nivel as keyof typeof nivelLabels]}
                          </Badge>
                        )}
                        {questao.topico && (
                          <Badge variant="secondary">{questao.topico}</Badge>
                        )}
                        <Badge variant="outline">{questao.sessao.titulo}</Badge>
                      </div>
                      <CardTitle className="text-lg">
                        {isExpanded ? questao.pergunta : truncateText(questao.pergunta, 120)}
                      </CardTitle>
                                         </div>
                     {!modoSelecao && (
                       <div className="flex items-center gap-2 ml-4">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => toggleQuestaoExpandida(questao.id)}
                         >
                           {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => abrirModalExclusao(questao)}
                           className="text-red-600 hover:text-red-700"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                     )}
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {['A', 'B', 'C', 'D', 'E'].map((letra) => {
                          const alternativa = questao[`alternativa${letra}` as keyof Questao] as string;
                          if (!alternativa) return null;
                          
                          const isCorrect = questao.respostaCorreta === letra;
                          
                          return (
                            <div 
                              key={letra} 
                              className={`p-3 rounded-lg border ${
                                isCorrect 
                                  ? 'bg-green-50 border-green-200 text-green-800' 
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <span className="font-semibold">{letra})</span> {alternativa}
                            </div>
                          );
                        })}
                      </div>
                      
                      {questao.explicacao && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-sm font-medium text-blue-800 mb-1">
                            Explicação:
                          </div>
                          <div className="text-sm text-blue-700">
                            {questao.explicacao}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog 
        open={!!questaoParaExcluir} 
        onOpenChange={() => {
          setQuestaoParaExcluir(null);
          setInfoQuestaoExclusao(null);
          setCarregandoInfo(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita e irá excluir também todas as respostas de usuários relacionadas a esta questão.
            </DialogDescription>
          </DialogHeader>
          
          {questaoParaExcluir && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-sm mb-2">Questão a ser excluída:</div>
                <div className="text-sm text-gray-600">
                  {truncateText(questaoParaExcluir.pergunta, 150)}
                </div>
              </div>
              
              {carregandoInfo ? (
                <div className="text-center text-sm text-muted-foreground">
                  Carregando informações...
                </div>
              ) : infoQuestaoExclusao && infoQuestaoExclusao._count && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="font-medium text-sm text-yellow-800 mb-2">
                    ⚠️ Impacto da exclusão:
                  </div>
                  <div className="text-sm text-yellow-700 space-y-1">
                    {(() => {
                      const count = infoQuestaoExclusao._count || { respostas: 0, respostasDetalhadas: 0 };
                      const totalRespostas = count.respostas + count.respostasDetalhadas;
                      
                      if (totalRespostas === 0) {
                        return <div>• Nenhuma resposta será afetada</div>;
                      }
                      
                      return (
                        <>
                          {count.respostas > 0 && (
                            <div>• {count.respostas} resposta(s) de usuário serão excluídas</div>
                          )}
                          {count.respostasDetalhadas > 0 && (
                            <div>• {count.respostasDetalhadas} resposta(s) detalhada(s) serão excluídas</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setQuestaoParaExcluir(null);
                setInfoQuestaoExclusao(null);
                setCarregandoInfo(false);
              }}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? 'Excluindo...' : 'Excluir Questão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 