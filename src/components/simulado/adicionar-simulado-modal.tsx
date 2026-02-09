"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Upload, CheckCircle, Loader2, Trash2 } from "lucide-react"
import { criarSimulado } from "@/interface/actions/simulado/create"
import { listarDisciplinas } from "@/interface/actions/disciplina/list"
import { getDisciplinasDoCiclo } from "@/interface/actions/plano-estudo/get-disciplinas-ciclo"
import { extrairGabaritoOficialAction, processarGabaritosEditadosAction } from "@/interface/actions/simulado/extrair-gabaritos"
import { salvarResultadoSimulado } from "@/interface/actions/simulado/salvar-resultado"
import { type GabaritoExtraido } from "@/application/services/gabarito.service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GabaritoEditor } from "./gabarito-editor"

interface AdicionarSimuladoModalProps {
  onSuccess?: () => void
  ciclosEstudo?: Array<{ id: string; nome: string }>
}

interface FormData {
  nome: string
  descricao: string
  semanaEstudoId: string
  dataRealizacao: string
}

interface Disciplina {
  id: string
  nome: string
  cor: string | null
}

interface DisciplinaIntervalo {
  disciplinaId: string
  questaoInicio: number
  questaoFim: number
}

type Step = 'dados-basicos' | 'upload-gabarito-oficial' | 'definir-disciplinas' | 'revisar-gabarito'

export function AdicionarSimuladoModal({ onSuccess, ciclosEstudo = [] }: AdicionarSimuladoModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('dados-basicos')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    descricao: "",
    semanaEstudoId: "",
    dataRealizacao: new Date().toISOString().split('T')[0],
  })

  const [gabaritoOficial, setGabaritoOficial] = useState<File | null>(null)
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [intervalos, setIntervalos] = useState<DisciplinaIntervalo[]>([])
  const [processando, setProcessando] = useState(false)
  const [gabaritoOficialExtraido, setGabaritoOficialExtraido] = useState<GabaritoExtraido | null>(null)
  const [extraindo, setExtraindo] = useState(false)

  // Debug: monitorar mudanças de step e gabarito extraído
  useEffect(() => {
    console.log('[Modal useEffect] currentStep mudou para:', currentStep)
    console.log('[Modal useEffect] gabaritoOficialExtraido:', gabaritoOficialExtraido ? 'existe' : 'null')
  }, [currentStep, gabaritoOficialExtraido])

  const carregarDisciplinas = async (semanaEstudoId?: string) => {
    try {
      console.log('Carregando disciplinas da semana:', semanaEstudoId)

      let response
      if (semanaEstudoId) {
        // Buscar disciplinas da semana específica
        response = await getDisciplinasDoCiclo(semanaEstudoId)
      } else {
        // Se não houver ciclo, buscar todas as disciplinas do usuário
        response = await listarDisciplinas()
      }

      console.log('Resposta disciplinas:', response)
      if (response.success && response.data) {
        setDisciplinas(response.data)
        console.log('Disciplinas carregadas:', response.data.length)

        // Inicializar com lista vazia - usuário escolhe quais adicionar
        setIntervalos([])
      } else {
        console.error('Erro ao carregar disciplinas:', response.error)
        toast({
          title: "Aviso",
          description: response.error || "Não foi possível carregar disciplinas",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      semanaEstudoId: "",
      dataRealizacao: new Date().toISOString().split('T')[0],
    })
    setGabaritoOficial(null)
    setIntervalos([])
    setCurrentStep('dados-basicos')
    setGabaritoOficialExtraido(null)
    setExtraindo(false)
    setProcessando(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 'dados-basicos') {
      if (!formData.nome.trim()) {
        toast({
          title: "Erro",
          description: "Por favor, preencha o nome do simulado",
          variant: "destructive",
        })
        return
      }
      setCurrentStep('upload-gabarito-oficial')
      return
    }

    if (currentStep === 'upload-gabarito-oficial') {
      if (!gabaritoOficial) {
        toast({
          title: "Erro",
          description: "Por favor, faça upload do gabarito oficial",
          variant: "destructive",
        })
        return
      }

      // Apenas carregar disciplinas, NÃO criar simulado ainda
      const semanaId = formData.semanaEstudoId && formData.semanaEstudoId.trim() !== ''
        ? formData.semanaEstudoId
        : undefined

      await carregarDisciplinas(semanaId)
      setCurrentStep('definir-disciplinas')
      return
    }

    if (currentStep === 'definir-disciplinas') {
      console.log('[Modal] Botão Processar clicado!')
      console.log('[Modal] currentStep:', currentStep)
      console.log('[Modal] intervalos:', intervalos)

      // Filtrar apenas disciplinas com intervalos preenchidos E com disciplinaId selecionado
      const intervalosValidos = intervalos.filter(
        intervalo => intervalo.disciplinaId && intervalo.questaoInicio > 0 && intervalo.questaoFim > 0
      )

      console.log('[Modal] intervalosValidos:', intervalosValidos)

      if (intervalosValidos.length === 0) {
        toast({
          title: "Erro",
          description: "Por favor, adicione pelo menos uma disciplina e defina seus intervalos de questões",
          variant: "destructive",
        })
        return
      }

      // Validar intervalos válidos (questaoInicio <= questaoFim, permite uma única questão)
      console.log('[Modal] Validando intervalos...')
      for (const intervalo of intervalosValidos) {
        console.log(`[Modal] Validando intervalo:`, intervalo)
        if (intervalo.questaoInicio > intervalo.questaoFim) {
          const disc = disciplinas.find(d => d.id === intervalo.disciplinaId)
          console.error(`[Modal] Erro de validação: início > fim`, intervalo)
          toast({
            title: "Erro",
            description: `O início deve ser menor ou igual ao fim do intervalo (${disc?.nome || 'Disciplina'})`,
            variant: "destructive",
          })
          return
        }
      }
      console.log('[Modal] Validação de intervalos OK!')

      // Avisar se há intervalos incompletos que serão ignorados
      const intervalosIncompletos = intervalos.filter(
        intervalo => !intervalo.disciplinaId || intervalo.questaoInicio === 0 || intervalo.questaoFim === 0
      )

      if (intervalosIncompletos.length > 0) {
        console.log(`[Modal] ${intervalosIncompletos.length} intervalos incompletos serão ignorados`)
      }

      console.log('[Modal] Indo para etapa de revisão...')
      await extrairGabaritosParaRevisao()
      console.log('[Modal] Extração concluída, indo para revisão!')
    }
  }

  const extrairGabaritosParaRevisao = async () => {
    console.log('[Modal] extrairGabaritosParaRevisao chamado - extraindo APENAS gabarito oficial')

    if (!gabaritoOficial) {
      toast({
        title: "Erro",
        description: "Gabarito oficial não carregado",
        variant: "destructive",
      })
      return
    }

    const intervalosValidos = intervalos.filter(
      intervalo => intervalo.disciplinaId && intervalo.questaoInicio > 0 && intervalo.questaoFim > 0
    )

    if (intervalosValidos.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma disciplina válida configurada",
        variant: "destructive",
      })
      return
    }

    setExtraindo(true)
    try {
      const formData = new FormData()
      formData.append('gabaritoOficial', gabaritoOficial)

      formData.append('intervalos', JSON.stringify(intervalosValidos.map(iv => ({
        questaoInicio: iv.questaoInicio,
        questaoFim: iv.questaoFim
      }))))

      toast({
        title: "Extraindo gabarito oficial...",
        description: "Analisando imagem com IA. Aguarde...",
      })

      const response = await extrairGabaritoOficialAction(formData)

      console.log('[Modal] Resposta da extração:', response)

      if (response.success && response.data) {
        console.log('[Modal] Gabarito oficial extraído:', response.data.oficial)
        setGabaritoOficialExtraido(response.data.oficial)

        console.log('[Modal] Mudando para step revisar-gabarito')
        setCurrentStep('revisar-gabarito')

        toast({
          title: "Extração concluída!",
          description: "Revise os gabaritos e faça correções se necessário",
        })
      } else {
        toast({
          title: "Erro",
          description: response.error || "Erro ao extrair gabaritos",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Modal] Erro na extração:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao extrair gabaritos",
        variant: "destructive",
      })
    } finally {
      setExtraindo(false)
    }
  }

  const handleConfirmarGabaritosEditados = async (
    oficialEditado: GabaritoExtraido,
    usuarioEditado: GabaritoExtraido
  ) => {
    console.log('[Modal] Gabaritos confirmados, processando...')
    console.log('[Modal] Oficial:', oficialEditado)
    console.log('[Modal] Usuario:', usuarioEditado)

    setProcessando(true)
    try {
      // 1. PRIMEIRO: Criar o simulado no banco de dados
      console.log('[Modal] Passo 1: Criando simulado...')
      const dadosSimulado = {
        nome: formData.nome,
        descricao: formData.descricao?.trim() ? formData.descricao : undefined,
        semanaEstudoId: formData.semanaEstudoId?.trim() ? formData.semanaEstudoId : undefined,
        dataRealizacao: new Date(formData.dataRealizacao),
      }

      const responseSimulado = await criarSimulado(dadosSimulado)

      if (!responseSimulado.success || !responseSimulado.data) {
        throw new Error(responseSimulado.error || 'Erro ao criar simulado')
      }

      const simuladoCriado = responseSimulado.data
      console.log('[Modal] Simulado criado com ID:', simuladoCriado.id)

      // 2. SEGUNDO: Processar comparação dos gabaritos
      console.log('[Modal] Passo 2: Comparando gabaritos...')

      const resultadoComparacao = await processarGabaritosEditadosAction(
        oficialEditado,
        usuarioEditado
      )

      console.log('[Modal] Resultado da comparação:', resultadoComparacao)

      if (!resultadoComparacao.success || !resultadoComparacao.data) {
        console.error('[Modal] Erro na comparação:', resultadoComparacao.error)
        throw new Error(resultadoComparacao.error || 'Erro ao comparar gabaritos')
      }

      const totalAcertos = resultadoComparacao.data.questoes.filter(q => q.acertou).length
      const totalQuestoes = resultadoComparacao.data.questoes.length
      console.log('[Modal] Comparação OK! Acertos:', totalAcertos, '/', totalQuestoes)

      // 3. TERCEIRO: Salvar resultado no banco
      console.log('[Modal] Passo 3: Salvando resultado no banco...')

      const intervalosValidos = intervalos.filter(
        intervalo => intervalo.disciplinaId && intervalo.questaoInicio > 0 && intervalo.questaoFim > 0
      )

      console.log('[Modal] Intervalos válidos:', intervalosValidos)

      console.log('[Modal] Chamando salvarResultadoSimulado...')

      const response = await salvarResultadoSimulado({
        simuladoId: simuladoCriado.id,
        resultado: resultadoComparacao.data,
        disciplinas: intervalosValidos,
      })

      console.log('[Modal] Resposta do salvarResultadoSimulado:', response)

      if (response.success) {
        toast({
          title: "Sucesso!",
          description: "Simulado processado com sucesso!",
        })
        setOpen(false)
        resetForm()
        onSuccess?.()
      } else {
        toast({
          title: "Erro",
          description: response.error || "Erro ao salvar simulado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[Modal] Erro ao processar:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar simulado",
        variant: "destructive",
      })
    } finally {
      setProcessando(false)
    }
  }

  // Função removida - não é mais necessária com o novo fluxo simplificado
  // O processamento agora acontece via handleConfirmarGabaritosEditados

  const handleFileChange = (file: File | null) => {
    setGabaritoOficial(file)
  }

  const adicionarIntervalo = () => {
    // Adicionar nova disciplina vazia
    setIntervalos([...intervalos, { disciplinaId: "", questaoInicio: 0, questaoFim: 0 }])
  }

  const removerIntervalo = (index: number) => {
    setIntervalos(intervalos.filter((_, i) => i !== index))
  }

  const atualizarIntervalo = (index: number, field: keyof DisciplinaIntervalo, value: string | number) => {
    const novosIntervalos = [...intervalos]
    novosIntervalos[index] = { ...novosIntervalos[index], [field]: value }
    setIntervalos(novosIntervalos)
  }

  const carregarExemplo = async () => {
    // Disciplinas de exemplo do TCE-PB com palavras-chave para matching
    const disciplinasExemplo = [
      { keywords: ["administração", "geral", "pública"], inicio: 1, fim: 10 },
      { keywords: ["atualidades", "conhecimentos", "gerais"], inicio: 11, fim: 15 },
      { keywords: ["auditoria", "governamental", "controle"], inicio: 16, fim: 19 },
      { keywords: ["auditoria", "privada"], inicio: 20, fim: 25 },
      { keywords: ["economia", "finanças"], inicio: 26, fim: 35 },
      { keywords: ["estatística"], inicio: 36, fim: 43 },
      { keywords: ["geografia"], inicio: 44, fim: 49 },
      { keywords: ["informática"], inicio: 50, fim: 54 },
      { keywords: ["legislação", "ética"], inicio: 55, fim: 59 },
      { keywords: ["legislação", "tributária"], inicio: 60, fim: 60 },
      { keywords: ["português", "portuguesa", "lingua"], inicio: 61, fim: 75 },
      { keywords: ["tecnologia", "informação", "ti", "hardware", "computador"], inicio: 76, fim: 80 },
    ]

    // Mapear disciplinas de exemplo para as disciplinas disponíveis
    const novosIntervalos: DisciplinaIntervalo[] = []
    const disciplinasUsadas = new Set<string>()

    for (const exemplo of disciplinasExemplo) {
      // Tentar encontrar disciplina existente com nome similar
      const disciplinaEncontrada = disciplinas.find(d => {
        if (disciplinasUsadas.has(d.id)) return false // Não reutilizar disciplinas

        const nomeNormalizado = d.nome.toLowerCase().trim()

        // Verificar se pelo menos 1 palavra-chave está presente
        return exemplo.keywords.some(keyword =>
          nomeNormalizado.includes(keyword.toLowerCase())
        )
      })

      if (disciplinaEncontrada) {
        novosIntervalos.push({
          disciplinaId: disciplinaEncontrada.id,
          questaoInicio: exemplo.inicio,
          questaoFim: exemplo.fim
        })
        disciplinasUsadas.add(disciplinaEncontrada.id)
      } else {
        // Se não encontrou, criar intervalo vazio
        novosIntervalos.push({
          disciplinaId: "",
          questaoInicio: exemplo.inicio,
          questaoFim: exemplo.fim
        })
      }
    }

    setIntervalos(novosIntervalos)

    const encontradas = novosIntervalos.filter(i => i.disciplinaId !== "").length
    const naoEncontradas = novosIntervalos.length - encontradas

    toast({
      title: "Exemplo carregado!",
      description: encontradas > 0
        ? `${encontradas} disciplinas encontradas automaticamente. ${naoEncontradas > 0 ? `Selecione manualmente as ${naoEncontradas} restantes.` : ""}`
        : "Selecione as disciplinas correspondentes para cada intervalo.",
      variant: "default",
    })
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'dados-basicos':
        return 'Dados Básicos do Simulado'
      case 'upload-gabarito-oficial':
        return 'Upload do Gabarito Oficial'
      case 'definir-disciplinas':
        return 'Definir Disciplinas e Intervalos'
      case 'revisar-gabarito':
        return 'Revisar Gabarito e Inserir Respostas'
      default:
        return 'Novo Simulado'
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value)
      if (!value) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Simulado
        </Button>
      </DialogTrigger>
      <DialogContent className={`${
        currentStep === 'revisar-gabarito'
          ? 'sm:max-w-[1200px]'
          : 'sm:max-w-[700px]'
      } max-h-[90vh] overflow-y-auto`}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getStepTitle()}</DialogTitle>
            <DialogDescription>
              {currentStep === 'dados-basicos' && 'Preencha as informações básicas do simulado'}
              {currentStep === 'upload-gabarito-oficial' && 'Faça upload da imagem do gabarito oficial'}
              {currentStep === 'definir-disciplinas' && 'Defina as disciplinas e os intervalos de questões'}
              {currentStep === 'revisar-gabarito' && 'Revise o gabarito oficial e insira suas respostas manualmente'}
            </DialogDescription>
            {/* Indicador de Step (Debug) */}
            <div className="text-xs text-gray-500 mt-2">
              Step atual: {currentStep} | Disciplinas: {disciplinas.length}
            </div>
          </DialogHeader>

          <div className="py-4">
            {/* Step 1: Dados Básicos */}
            {currentStep === 'dados-basicos' && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do Simulado *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: AFRFB 2024"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional do simulado"
                    rows={3}
                  />
                </div>

                {console.log('[Modal] Ciclos disponíveis:', ciclosEstudo)}
                {ciclosEstudo.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="ciclo">Ciclo de Estudos</Label>
                    <Select
                      value={formData.semanaEstudoId}
                      onValueChange={(value) => {
                        console.log('[Modal] Ciclo selecionado:', value)
                        setFormData({ ...formData, semanaEstudoId: value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ciclo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {ciclosEstudo.map((ciclo) => (
                          <SelectItem key={ciclo.id} value={ciclo.id}>
                            {ciclo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="data">Data de Realização *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.dataRealizacao}
                    onChange={(e) => setFormData({ ...formData, dataRealizacao: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Upload do Gabarito Oficial */}
            {currentStep === 'upload-gabarito-oficial' && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Gabarito Oficial *</Label>
                  <p className="text-sm text-gray-500 mb-2">
                    Faça upload da imagem do gabarito oficial da prova. Você poderá inserir suas respostas manualmente depois.
                  </p>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="hidden"
                      id="gabarito-oficial"
                    />
                    <label htmlFor="gabarito-oficial" className="cursor-pointer">
                      {gabaritoOficial ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">{gabaritoOficial.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-10 w-10 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">Clique para fazer upload</p>
                          <p className="text-xs text-gray-500">JPG, PNG ou PDF</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Definir Disciplinas */}
            {currentStep === 'definir-disciplinas' && (
              <div className="grid gap-4">
                {console.log('Renderizando step 3 - definir-disciplinas')}
                {console.log('Disciplinas:', disciplinas)}
                {console.log('Intervalos:', intervalos)}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Disciplinas e Intervalos de Questões</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Adicione as disciplinas que deseja processar no simulado
                    </p>
                    {intervalos.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                          {intervalos.filter(i => i.disciplinaId && i.questaoInicio > 0 && i.questaoFim > 0).length} completas
                        </span>
                        <span className="ml-2 text-gray-500">
                          de {intervalos.length} total
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={carregarExemplo}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      Carregar Exemplo (TCE-PB)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={adicionarIntervalo}
                      disabled={disciplinas.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {intervalos.map((intervalo, index) => {
                    const disciplina = disciplinas.find(d => d.id === intervalo.disciplinaId)
                    const isCompleto = intervalo.disciplinaId && intervalo.questaoInicio > 0 && intervalo.questaoFim > 0
                    return (
                      <div key={index} className={`flex gap-3 items-start p-4 border rounded-lg ${isCompleto ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        {/* Indicador de Completo */}
                        {isCompleto && (
                          <div className="mt-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        )}
                        <div className="flex-1 grid gap-3">
                          {/* Seletor de Disciplina */}
                          <div className="grid gap-2">
                            <Label className="text-xs text-gray-500">Disciplina</Label>
                            <Select
                              value={intervalo.disciplinaId}
                              onValueChange={(value) => atualizarIntervalo(index, 'disciplinaId', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione uma disciplina" />
                              </SelectTrigger>
                              <SelectContent>
                                {disciplinas.map((disc) => (
                                  <SelectItem key={disc.id} value={disc.id}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: disc.cor || '#3b82f6' }}
                                      />
                                      {disc.nome}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Intervalos */}
                          <div className="flex items-center gap-2">
                            <div className="grid gap-1 flex-1">
                              <Label className="text-xs text-gray-500">Questão Inicial</Label>
                              <Input
                                type="number"
                                min="1"
                                className="h-9"
                                value={intervalo.questaoInicio || ''}
                                placeholder="Ex: 1"
                                onChange={(e) => atualizarIntervalo(index, 'questaoInicio', parseInt(e.target.value) || 0)}
                              />
                            </div>

                            <span className="text-gray-400 mt-5">até</span>

                            <div className="grid gap-1 flex-1">
                              <Label className="text-xs text-gray-500">Questão Final</Label>
                              <Input
                                type="number"
                                min="1"
                                className="h-9"
                                value={intervalo.questaoFim || ''}
                                placeholder="Ex: 20"
                                onChange={(e) => atualizarIntervalo(index, 'questaoFim', parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Botão Remover */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerIntervalo(index)}
                          className="mt-7"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )
                  })}

                  {intervalos.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      <p className="text-sm font-medium mb-3">Nenhuma disciplina adicionada</p>
                      <p className="text-xs mb-4">Clique em "Carregar Exemplo (TCE-PB)" para ver um exemplo ou "Adicionar" para começar do zero</p>

                      {/* Preview do Exemplo */}
                      <div className="mt-4 mx-auto max-w-md text-left bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-blue-900 mb-2">Exemplo TCE-PB (80 questões):</p>
                        <div className="space-y-1 text-xs text-blue-800">
                          <p>• Administração Geral: Q1-Q10 (10 questões)</p>
                          <p>• Atualidades: Q11-Q15 (5 questões)</p>
                          <p>• Auditoria Governamental: Q16-Q19 (4 questões)</p>
                          <p>• Economia e Finanças: Q26-Q35 (10 questões)</p>
                          <p>• Língua Portuguesa: Q61-Q75 (15 questões)</p>
                          <p className="text-blue-600 mt-2">... e mais 7 disciplinas</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Revisar Gabarito */}
            {(() => {
              console.log('[Modal Render] Verificando step revisar-gabarito:', {
                currentStep,
                temGabaritoOficialExtraido: !!gabaritoOficialExtraido,
                shouldRender: currentStep === 'revisar-gabarito' && !!gabaritoOficialExtraido
              })
              return null
            })()}
            {currentStep === 'revisar-gabarito' && gabaritoOficialExtraido && (() => {
              console.log('[Modal Render] Renderizando editor de gabarito!')
              // Criar gabarito do usuário vazio para o editor
              const intervalosValidos = intervalos.filter(
                intervalo => intervalo.disciplinaId && intervalo.questaoInicio > 0 && intervalo.questaoFim > 0
              )

              const gabaritoUsuarioVazio: GabaritoExtraido = {
                questoes: []
              }

              // Preencher com "N" (não marcado) para todas as questões
              for (const intervalo of intervalosValidos) {
                for (let num = intervalo.questaoInicio; num <= intervalo.questaoFim; num++) {
                  gabaritoUsuarioVazio.questoes.push({
                    numero: num,
                    resposta: 'N'  // Não marcado - usuário preencherá manualmente
                  })
                }
              }

              return (
                <div className="h-[600px]">
                  <GabaritoEditor
                    oficial={gabaritoOficialExtraido}
                    usuario={gabaritoUsuarioVazio}
                    onConfirm={handleConfirmarGabaritosEditados}
                    onCancel={() => setCurrentStep('definir-disciplinas')}
                  />
                </div>
              )
            })()}

          </div>

          <DialogFooter>
            {currentStep !== 'dados-basicos' &&
             currentStep !== 'revisar-gabarito' &&
             !processando && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (currentStep === 'upload-gabarito-oficial') setCurrentStep('dados-basicos')
                  if (currentStep === 'definir-disciplinas') setCurrentStep('upload-gabarito-oficial')
                }}
              >
                Voltar
              </Button>
            )}
            {currentStep !== 'revisar-gabarito' && (
              <Button type="submit" disabled={loading || processando || extraindo}>
                {processando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {extraindo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {processando ? "Processando..." : extraindo ? "Extraindo..." : loading ? "Salvando..." : currentStep === 'definir-disciplinas' ? "Continuar para Revisão" : "Próximo"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
