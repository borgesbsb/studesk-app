"use client"

import { useState, useRef, DragEvent, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, CheckCircle2, AlertCircle, X, Bot, Zap, Eye, Settings } from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

interface UploadedFile {
  fileName: string
  fileUrl: string
  originalName: string
  size: number
  uploadedAt: string
}

interface FineTuningUploadProps {
  concursoId: string
  onUploadSuccess?: (file: UploadedFile) => void
}

export function FineTuningUpload({ concursoId, onUploadSuccess }: FineTuningUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingJobs, setTrainingJobs] = useState<any[]>([])
  const [openAIConfigured, setOpenAIConfigured] = useState<boolean | null>(null)
  const [configInfo, setConfigInfo] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar configurações e status dos jobs ao montar o componente
  useEffect(() => {
    checkOpenAIConfig()
    loadTrainingStatus()
  }, [concursoId])

  const checkOpenAIConfig = async () => {
    try {
      const response = await fetch('/api/fine-tuning/check-config')
      const result = await response.json()

      if (response.ok) {
        setOpenAIConfigured(result.isConfigured)
        setConfigInfo(result.config)
        
        if (!result.isConfigured) {
          toast.warning("OpenAI não configurada", {
            description: "Configure a API Key da OpenAI para usar o fine tuning"
          })
        }
      }
    } catch (error) {
      console.error('Erro ao verificar configuração:', error)
      setOpenAIConfigured(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error("Apenas arquivos PDF são permitidos")
      return
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Tamanho máximo: 50MB")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('concursoId', concursoId)

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/upload/fine-tuning', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (response.ok && result.success) {
        const uploadedFile: UploadedFile = {
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          originalName: result.details.originalName,
          size: result.details.size,
          uploadedAt: result.details.uploadedAt
        }

        setUploadedFiles(prev => [...prev, uploadedFile])
        onUploadSuccess?.(uploadedFile)
        
        toast.success("PDF enviado com sucesso! Agora você pode extrair o texto e treinar o modelo.")
      } else {
        throw new Error(result.error || 'Erro no upload')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error("Erro ao enviar o arquivo", {
        description: error instanceof Error ? error.message : "Erro desconhecido"
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const extractTextFromPDFs = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Nenhum PDF encontrado para extrair texto")
      return
    }

    if (!openAIConfigured) {
      toast.error("OpenAI não configurada", {
        description: "Configure a API Key da OpenAI para extrair texto"
      })
      return
    }

    setIsExtracting(true)

    try {
      for (const file of uploadedFiles) {
        toast.info(`Extraindo texto de: ${file.originalName}`)
        
        const response = await fetch('/api/fine-tuning/extract-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: file.fileUrl,
            concursoId: concursoId
          }),
        })

        const result = await response.json()

        if (response.ok && result.success) {
          toast.success(`Texto extraído de: ${file.originalName}`)
        } else {
          toast.error(`Erro ao extrair texto de: ${file.originalName}`, {
            description: result.error
          })
        }
      }

      toast.success("Extração de texto concluída! Agora você pode treinar o modelo.")
    } catch (error) {
      console.error('Erro na extração de texto:', error)
      toast.error("Erro na extração de texto")
    } finally {
      setIsExtracting(false)
    }
  }

  const startTraining = async () => {
    if (!openAIConfigured) {
      toast.error("OpenAI não configurada", {
        description: "Configure a API Key da OpenAI para treinar o modelo"
      })
      return
    }

    setIsTraining(true)

    try {
      const response = await fetch('/api/fine-tuning/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concursoId: concursoId
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Treinamento iniciado com sucesso!", {
          description: `Job ID: ${result.jobId}`
        })
        
        // Recarregar status dos jobs
        await loadTrainingStatus()
      } else {
        toast.error("Erro ao iniciar treinamento", {
          description: result.error
        })
      }
    } catch (error) {
      console.error('Erro ao iniciar treinamento:', error)
      toast.error("Erro ao iniciar treinamento")
    } finally {
      setIsTraining(false)
    }
  }

  const loadTrainingStatus = async () => {
    try {
      const response = await fetch(`/api/fine-tuning/status?concursoId=${concursoId}`)
      const result = await response.json()

      if (response.ok && result.success) {
        setTrainingJobs(result.jobs)
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'text-green-500'
      case 'failed': return 'text-red-500'
      case 'running': return 'text-blue-500'
      case 'pending': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Fine Tuning - Upload de PDFs
          {openAIConfigured !== null && (
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              openAIConfigured 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                openAIConfigured ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {openAIConfigured ? 'OpenAI OK' : 'OpenAI Não Configurada'}
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Envie arquivos PDF específicos deste concurso para treinamento personalizado do modelo de IA
          {configInfo && openAIConfigured && (
            <span className="block text-xs text-muted-foreground mt-1">
              Modelo: {configInfo.model} • Temp: {configInfo.temperature} • Max Tokens: {configInfo.maxTokens}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Área de Upload */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          {isUploading ? (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-primary animate-pulse" />
              <div>
                <p className="text-sm font-medium">Enviando arquivo...</p>
                <Progress value={uploadProgress} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Arraste um PDF aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Máximo: 50MB • Apenas arquivos PDF
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Lista de arquivos enviados */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Arquivos Enviados:</h4>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botões de Ação */}
        {uploadedFiles.length > 0 && (
          <div className="flex gap-4">
            <Button 
              onClick={extractTextFromPDFs}
              disabled={isExtracting || !openAIConfigured}
              variant="outline"
              className="flex-1"
            >
              {isExtracting ? (
                <>
                  <Zap className="mr-2 h-4 w-4 animate-pulse" />
                  Extraindo Texto...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Extrair Texto dos PDFs
                </>
              )}
            </Button>

            <Button 
              onClick={startTraining}
              disabled={isTraining || !openAIConfigured}
              className="flex-1"
            >
              {isTraining ? (
                <>
                  <Bot className="mr-2 h-4 w-4 animate-pulse" />
                  Iniciando Treinamento...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Treinar Modelo
                </>
              )}
            </Button>

            <Button 
              onClick={loadTrainingStatus}
              variant="ghost"
              size="icon"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Status dos Jobs de Treinamento */}
        {trainingJobs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Status do Treinamento:</h4>
            {trainingJobs.map((job, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Job ID: {job.jobId}</p>
                    <p className={`text-xs ${getStatusColor(job.currentStatus)}`}>
                      Status: {job.currentStatus}
                    </p>
                    {job.fineTunedModel && (
                      <p className="text-xs text-green-600">
                        Modelo: {job.fineTunedModel}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString('pt-BR')}
                  </p>
                  {job.trainedTokens && (
                    <p className="text-xs text-muted-foreground">
                      Tokens: {job.trainedTokens}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alerta de Configuração */}
        {openAIConfigured === false && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="text-sm flex-1">
                <p className="font-medium text-red-900 dark:text-red-100 mb-1">
                  OpenAI não configurada
                </p>
                <p className="text-red-700 dark:text-red-300 text-xs mb-2">
                  Para usar o Fine Tuning, você precisa configurar sua API Key da OpenAI.
                </p>
                <Button 
                  onClick={() => window.open('/openai', '_blank')}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Settings className="mr-2 h-3 w-3" />
                  Configurar OpenAI
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Processo de Fine Tuning:
              </p>
              <ol className="text-blue-700 dark:text-blue-300 space-y-1 text-xs list-decimal list-inside">
                <li>Configure a API Key da OpenAI (se ainda não configurou)</li>
                <li>Envie PDFs específicos deste concurso (editais, provas, apostilas)</li>
                <li>Clique em "Extrair Texto dos PDFs" para processar o conteúdo com IA</li>
                <li>Clique em "Treinar Modelo" para iniciar o fine tuning personalizado</li>
                <li>Aguarde a conclusão do treinamento (pode levar alguns minutos)</li>
                <li>O modelo treinado será usado para gerar questões específicas do concurso</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 