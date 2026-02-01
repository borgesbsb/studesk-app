'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Crop,
  Sun,
  Contrast,
  Sparkles,
  Check,
  X,
  RotateCcw
} from 'lucide-react'

interface ImageAdjusterProps {
  image: File
  onConfirm: (adjustedImage: File) => void
  onCancel: () => void
  tipo: 'oficial' | 'usuario'
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function ImageAdjuster({ image, onConfirm, onCancel, tipo }: ImageAdjusterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

  // Controles de ajuste
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)

  // Pan (movimentação quando zoom > 1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Crop
  const [cropMode, setCropMode] = useState(false)
  const [cropArea, setCropArea] = useState<CropArea | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Filtros
  const [grayScale, setGrayScale] = useState(false)
  const [sharpen, setSharpen] = useState(false)

  // Carregar imagem
  useEffect(() => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
      img.onload = () => {
        setOriginalImage(img)
        // NÃO definir cropArea aqui - deixar null até o usuário fazer crop
        // setCropArea será definido apenas quando o usuário desenhar uma área
      }
    }

    reader.readAsDataURL(image)
  }, [image])

  // Renderizar canvas com ajustes
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar tamanho do canvas (SEM zoom - zoom é visual apenas)
    const maxWidth = 800
    const maxHeight = 600
    const scale = Math.min(
      maxWidth / originalImage.width,
      maxHeight / originalImage.height,
      1
    )

    // Tamanho base do canvas (sem zoom)
    const baseWidth = originalImage.width * scale
    const baseHeight = originalImage.height * scale

    canvas.width = baseWidth
    canvas.height = baseHeight

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Aplicar transformações
    ctx.save()

    // Aplicar zoom ANTES das outras transformações (visual apenas)
    const offsetX = (canvas.width * (1 - zoom)) / 2
    const offsetY = (canvas.height * (1 - zoom)) / 2

    // Aplicar pan offset (movimentação do usuário)
    ctx.translate(offsetX + panOffset.x, offsetY + panOffset.y)
    ctx.scale(zoom, zoom)

    // Centralizar rotação
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    // Aplicar filtros CSS
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      ${grayScale ? 'grayscale(100%)' : ''}
    `

    // Desenhar imagem
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height)

    // Desenhar área de crop ANTES do restore (dentro das transformações)
    if (cropMode && cropArea && cropArea.width > 0 && cropArea.height > 0) {
      // cropArea está em coordenadas da imagem original
      // Converter para coordenadas do canvas BASE
      const scaleToCanvas = canvas.width / originalImage.width

      const cropX = cropArea.x * scaleToCanvas
      const cropY = cropArea.y * scaleToCanvas
      const cropW = cropArea.width * scaleToCanvas
      const cropH = cropArea.height * scaleToCanvas

      // Salvar estado atual (com zoom aplicado)
      ctx.save()

      // Resetar transformações para desenhar o crop sobre a imagem transformada
      ctx.setTransform(1, 0, 0, 1, 0, 0)

      // Aplicar novamente apenas zoom e pan para o overlay
      const offsetX = (canvas.width * (1 - zoom)) / 2
      const offsetY = (canvas.height * (1 - zoom)) / 2
      ctx.translate(offsetX + panOffset.x, offsetY + panOffset.y)
      ctx.scale(zoom, zoom)

      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 3 / zoom // Ajustar espessura da linha para compensar zoom
      ctx.setLineDash([10 / zoom, 5 / zoom])

      ctx.strokeRect(cropX, cropY, cropW, cropH)

      // Escurecer área fora do crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, cropY)
      ctx.fillRect(0, cropY, cropX, cropH)
      ctx.fillRect(cropX + cropW, cropY, canvas.width - cropX - cropW, cropH)
      ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - cropY - cropH)

      ctx.restore()
    }

    // Aplicar sharpen se ativado (antes do restore para pegar a imagem transformada)
    if (sharpen) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const sharpened = applySharpen(imageData)
      ctx.putImageData(sharpened, 0, 0)
    }

    ctx.restore()

  }, [originalImage, brightness, contrast, rotation, zoom, panOffset, grayScale, sharpen, cropMode, cropArea])

  // Renderizar PREVIEW FINAL (o que será enviado para a IA)
  useEffect(() => {
    if (!originalImage || !previewCanvasRef.current) return

    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    console.log('🟣 Preview: cropArea =', cropArea)

    // Se há crop, usar área cortada, senão usar imagem completa
    if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
      console.log('🟣 Preview: APLICANDO CROP', {
        x: cropArea.x,
        y: cropArea.y,
        width: cropArea.width,
        height: cropArea.height
      })
      canvas.width = cropArea.width
      canvas.height = cropArea.height
    } else {
      console.log('🟣 Preview: SEM CROP - imagem completa')
      canvas.width = originalImage.width
      canvas.height = originalImage.height
    }

    // Aplicar todos os ajustes FINAIS
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      ${grayScale ? 'grayscale(100%)' : ''}
    `

    // Desenhar região cortada ou imagem completa
    if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
      ctx.drawImage(
        originalImage,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, canvas.width, canvas.height
      )
    } else {
      ctx.drawImage(originalImage, 0, 0)
    }

    // Aplicar sharpen se necessário
    if (sharpen) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const sharpened = applySharpen(imageData)
      ctx.putImageData(sharpened, 0, 0)
    }

  }, [originalImage, brightness, contrast, grayScale, sharpen, cropArea])

  // Função de sharpen
  const applySharpen = (imageData: ImageData): ImageData => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const output = new ImageData(width, height)

    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c
              const kernelIdx = (ky + 1) * 3 + (kx + 1)
              sum += data[idx] * kernel[kernelIdx]
            }
          }
          const outIdx = (y * width + x) * 4 + c
          output.data[outIdx] = Math.max(0, Math.min(255, sum))
        }
        const alphaIdx = (y * width + x) * 4 + 3
        output.data[alphaIdx] = 255
      }
    }

    return output
  }

  // Handlers de crop - convertendo coordenadas do canvas para coordenadas da imagem original
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !originalImage) return

    const rect = canvasRef.current.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    if (cropMode) {
      // Modo CROP: desenhar retângulo de seleção
      const canvas = canvasRef.current

      // Precisamos reverter as transformações de zoom e pan para obter coordenadas corretas
      // 1. Remover offset de centralização do zoom
      const offsetX = (canvas.width * (1 - zoom)) / 2
      const offsetY = (canvas.height * (1 - zoom)) / 2

      // 2. Ajustar para pan offset
      const adjustedX = (canvasX - offsetX - panOffset.x) / zoom
      const adjustedY = (canvasY - offsetY - panOffset.y) / zoom

      // 3. Converter de coordenadas de canvas para coordenadas de imagem original
      const scaleX = originalImage.width / canvas.width
      const scaleY = originalImage.height / canvas.height

      const imageX = adjustedX * scaleX
      const imageY = adjustedY * scaleY

      console.log('🔵 Crop - canvas:', { canvasX, canvasY })
      console.log('🔵 Crop - adjusted:', { adjustedX, adjustedY, zoom, panOffset })
      console.log('🔵 Crop - image coords:', { imageX, imageY })

      setIsDragging(true)
      setDragStart({ x: imageX, y: imageY })
      setCropArea({ x: imageX, y: imageY, width: 0, height: 0 })
    } else if (zoom > 1) {
      // Modo PAN: arrastar para mover a visualização
      setIsPanning(true)
      setPanStart({ x: canvasX, y: canvasY })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !originalImage) return

    const rect = canvasRef.current.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    if (isDragging && cropMode) {
      // Modo CROP: atualizar área de crop
      const canvas = canvasRef.current

      // Reverter transformações de zoom e pan
      const offsetX = (canvas.width * (1 - zoom)) / 2
      const offsetY = (canvas.height * (1 - zoom)) / 2

      const adjustedX = (canvasX - offsetX - panOffset.x) / zoom
      const adjustedY = (canvasY - offsetY - panOffset.y) / zoom

      const scaleX = originalImage.width / canvas.width
      const scaleY = originalImage.height / canvas.height

      const imageX = adjustedX * scaleX
      const imageY = adjustedY * scaleY

      const newCropArea = {
        x: Math.min(dragStart.x, imageX),
        y: Math.min(dragStart.y, imageY),
        width: Math.abs(imageX - dragStart.x),
        height: Math.abs(imageY - dragStart.y)
      }

      console.log('🟢 Crop area:', newCropArea)
      setCropArea(newCropArea)
    } else if (isPanning && zoom > 1) {
      // Modo PAN: mover a visualização
      const deltaX = canvasX - panStart.x
      const deltaY = canvasY - panStart.y

      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      setPanStart({ x: canvasX, y: canvasY })
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    setIsPanning(false)
  }

  // Processar e salvar imagem
  const handleConfirm = async () => {
    if (!canvasRef.current || !originalImage) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Determinar dimensões da imagem fonte (com ou sem crop)
    let sourceWidth, sourceHeight, sourceX, sourceY

    if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
      sourceWidth = cropArea.width
      sourceHeight = cropArea.height
      sourceX = cropArea.x
      sourceY = cropArea.y
    } else {
      sourceWidth = originalImage.width
      sourceHeight = originalImage.height
      sourceX = 0
      sourceY = 0
    }

    // DEFINIR TAMANHO IDEAL PARA IA (nem muito pequeno, nem muito grande)
    const MIN_DIMENSION = 1500  // Mínimo para IA conseguir ler detalhes
    const MAX_DIMENSION = 3000  // Máximo para não estourar custo/tempo

    let finalWidth = sourceWidth
    let finalHeight = sourceHeight

    // Calcular qual dimensão é a menor
    const minCurrentDimension = Math.min(sourceWidth, sourceHeight)
    const maxCurrentDimension = Math.max(sourceWidth, sourceHeight)

    let scale = 1

    // Se MUITO PEQUENA: fazer upscaling
    if (minCurrentDimension < MIN_DIMENSION) {
      scale = MIN_DIMENSION / minCurrentDimension
      finalWidth = Math.round(sourceWidth * scale)
      finalHeight = Math.round(sourceHeight * scale)
      console.log('⬆️ Imagem muito pequena, fazendo upscaling com fator:', scale.toFixed(2))
    }
    // Se MUITO GRANDE: fazer downscaling
    else if (maxCurrentDimension > MAX_DIMENSION) {
      scale = MAX_DIMENSION / maxCurrentDimension
      finalWidth = Math.round(sourceWidth * scale)
      finalHeight = Math.round(sourceHeight * scale)
      console.log('⬇️ Imagem muito grande, fazendo downscaling com fator:', scale.toFixed(2))
    }
    // Tamanho já está adequado
    else {
      console.log('✅ Tamanho já está adequado, mantendo original')
    }

    canvas.width = finalWidth
    canvas.height = finalHeight

    console.log('📐 Tamanho da imagem para IA:', {
      original: `${sourceWidth}x${sourceHeight}`,
      final: `${finalWidth}x${finalHeight}`,
      escala: scale.toFixed(2),
      reduzido: finalWidth !== sourceWidth || finalHeight !== sourceHeight
    })

    // Configurar qualidade de interpolação (importante para upscaling)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Aplicar todos os ajustes
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      ${grayScale ? 'grayscale(100%)' : ''}
    `

    // Desenhar região (cortada ou completa) redimensionada com alta qualidade
    ctx.drawImage(
      originalImage,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, finalWidth, finalHeight
    )

    // Aplicar sharpen se necessário
    if (sharpen) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const sharpened = applySharpen(imageData)
      ctx.putImageData(sharpened, 0, 0)
    }

    // Converter para blob e criar novo File
    canvas.toBlob((blob) => {
      if (!blob) return

      const adjustedFile = new File(
        [blob],
        `${tipo}_ajustado_${image.name}`,
        { type: 'image/jpeg' }
      )

      const sizeKB = (blob.size / 1024).toFixed(2)
      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2)

      console.log('📦 Arquivo final para IA:', {
        nome: adjustedFile.name,
        tamanho: blob.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`,
        tipo: adjustedFile.type
      })

      onConfirm(adjustedFile)
    }, 'image/jpeg', 0.98)  // Qualidade 98% para preservar detalhes das bolinhas
  }

  const resetAdjustments = () => {
    setBrightness(100)
    setContrast(100)
    setRotation(0)
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
    setGrayScale(false)
    setSharpen(false)
    setCropMode(false)
    setCropArea(null) // Resetar crop para null (sem crop)
  }

  // Resetar pan quando zoom volta para 1
  useEffect(() => {
    if (zoom === 1) {
      setPanOffset({ x: 0, y: 0 })
    }
  }, [zoom])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Ajustar Gabarito {tipo === 'oficial' ? 'Oficial' : 'do Usuário'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Ajuste a imagem para melhorar a detecção das marcações
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAdjustments}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Resetar
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel ESQUERDO: Edição com Crop */}
        <div className="flex-1 flex flex-col border-r">
          <div className="px-4 py-2 bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-900">Edição</h4>
              <span className="text-xs text-blue-700">
                {cropMode ? '📐 Modo Corte Ativo' : '🖼️ Visualização Completa'}
              </span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-100 p-4 overflow-auto">
            <canvas
              ref={canvasRef}
              className={`border-2 border-gray-300 shadow-lg ${
                cropMode ? 'cursor-crosshair' :
                zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') :
                'cursor-default'
              }`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          </div>
        </div>

        {/* Painel CENTRAL: Preview Final (o que vai para IA) */}
        <div className="flex-1 flex flex-col border-r">
          <div className="px-4 py-2 bg-green-50 border-b">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-green-900">Preview Final - Enviado para IA</h4>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs text-green-700">Processado</span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-4 overflow-auto">
            <div className="flex flex-col items-center gap-3">
              <canvas
                ref={previewCanvasRef}
                className="border-2 border-green-500 shadow-xl max-w-full max-h-full"
              />
              <div className="text-xs text-center text-gray-600 bg-white px-3 py-2 rounded border">
                <p className="font-medium text-green-700">✓ Esta será a imagem processada pela IA</p>
                <p className="mt-1">Com todos os ajustes aplicados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Painel DIREITO: Controles */}
        <div className="w-64 border-l bg-gray-50 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Brilho */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Sun className="w-4 h-4 text-yellow-600" />
                  Brilho
                </Label>
                <span className="text-xs text-gray-600">{brightness}%</span>
              </div>
              <Slider
                value={[brightness]}
                onValueChange={([value]) => setBrightness(value)}
                min={50}
                max={150}
                step={1}
                className="w-full"
              />
            </div>

            {/* Contraste */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Contrast className="w-4 h-4 text-purple-600" />
                  Contraste
                </Label>
                <span className="text-xs text-gray-600">{contrast}%</span>
              </div>
              <Slider
                value={[contrast]}
                onValueChange={([value]) => setContrast(value)}
                min={50}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Zoom */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <ZoomIn className="w-4 h-4 text-blue-600" />
                  Zoom
                </Label>
                <span className="text-xs text-gray-600">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
              {zoom > 1 && (
                <p className="text-xs text-blue-600 italic">
                  💡 Arraste a imagem para mover a visualização
                </p>
              )}
            </div>

            {/* Rotação */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <RotateCw className="w-4 h-4 text-green-600" />
                  Rotação
                </Label>
                <span className="text-xs text-gray-600">{rotation}°</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev - 90) % 360)}
                  className="flex-1"
                >
                  -90°
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex-1"
                >
                  +90°
                </Button>
              </div>
            </div>

            <div className="border-t pt-4"></div>

            {/* Filtros */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Filtros</Label>

              <div className="flex items-center justify-between">
                <Label htmlFor="grayscale" className="text-sm cursor-pointer">
                  Escala de Cinza
                </Label>
                <input
                  id="grayscale"
                  type="checkbox"
                  checked={grayScale}
                  onChange={(e) => setGrayScale(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sharpen" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Nitidez
                </Label>
                <input
                  id="sharpen"
                  type="checkbox"
                  checked={sharpen}
                  onChange={(e) => setSharpen(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>

            <div className="border-t pt-4"></div>

            {/* Crop */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Cortar Imagem</Label>

              <Button
                type="button"
                variant={cropMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCropMode(!cropMode)}
                className="w-full"
              >
                <Crop className="w-4 h-4 mr-2" />
                {cropMode ? 'Cancelar Corte' : 'Ativar Modo Corte'}
              </Button>

              {cropMode && (
                <p className="text-xs text-gray-600">
                  Clique e arraste no canvas para selecionar a área
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t bg-gradient-to-r from-blue-50 via-green-50 to-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-700">Edição com zoom e crop</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-700 font-medium">Preview final → IA</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-gray-700">Controles de ajuste</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="text-xs text-gray-500 italic px-1">
              ℹ️ A imagem será otimizada automaticamente (mín: 1500px, máx: 3000px) para melhor precisão da IA
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                <X className="w-4 h-4 mr-1.5" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Confirmar Ajustes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
