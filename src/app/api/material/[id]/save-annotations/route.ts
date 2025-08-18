import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import * as path from 'path'
import { prisma } from '@/lib/db'

// Função para limpar arquivos antigos do mesmo material
async function cleanupOldFiles(materialId: string, currentFileName: string, originalFileName: string) {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Buscar todos os arquivos que começam com timestamp e contêm "annotated"
    const files = await readdir(uploadsDir)
    const annotatedFiles = files.filter(file => 
      file.includes('annotated') && 
      file !== currentFileName &&
      file.match(/^\d+-annotated-/)
    )
    
    console.log(`📋 Encontrados ${annotatedFiles.length} arquivos anotados para limpeza`)
    console.log(`🛡️ Arquivo original protegido: ${originalFileName}`)
    
    // Manter apenas os 3 arquivos anotados mais recentes para cada material
    if (annotatedFiles.length > 3) {
      // Ordenar por timestamp (mais recente primeiro)
      const sortedFiles = annotatedFiles
        .map(file => ({
          name: file,
          timestamp: parseInt(file.split('-')[0]) || 0
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
      
      // Remover arquivos antigos (manter apenas os 3 mais recentes)
      const filesToDelete = sortedFiles.slice(3)
      
      console.log(`🗑️ Removendo ${filesToDelete.length} arquivos anotados antigos...`)
      
      for (const file of filesToDelete) {
        try {
          // Verificar se não é o arquivo original antes de remover
          if (file.name !== originalFileName) {
            await unlink(path.join(uploadsDir, file.name))
            console.log(`🗑️ Arquivo anotado antigo removido: ${file.name}`)
          } else {
            console.log(`🛡️ Arquivo original protegido (não removido): ${file.name}`)
          }
        } catch (error) {
          console.error(`❌ Erro ao remover arquivo ${file.name}:`, error)
        }
      }
    } else {
      console.log(`✅ Apenas ${annotatedFiles.length} arquivos anotados encontrados, nenhum arquivo removido`)
    }
    
    console.log(`✅ Limpeza concluída. Arquivo original preservado: ${originalFileName}`)
  } catch (error) {
    console.error('❌ Erro ao limpar arquivos antigos:', error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params
    const formData = await request.formData()
    
    const pdfFile = formData.get('pdf') as File
    
    if (!pdfFile || !materialId) {
      return NextResponse.json(
        { error: 'PDF e materialId são obrigatórios' },
        { status: 400 }
      )
    }

    console.log('📥 Recebido PDF para salvar:', pdfFile.name, pdfFile.size, 'bytes')

    // Verificar se o material existe
    const material = await prisma.materialEstudo.findUnique({
      where: { id: materialId }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Converter o arquivo para buffer
    const pdfBuffer = await pdfFile.arrayBuffer()
    
    // Criar diretório se não existir
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    
    // Extrair o nome original do arquivo, removendo timestamps e prefixos anteriores
    let originalName = material.arquivoPdfUrl?.split('/').pop() || 'documento.pdf'
    
    console.log('📄 Nome original extraído:', originalName)
    
    // Remover timestamp inicial se existir
    originalName = originalName.replace(/^\d+-/, '')
    
    // Remover prefixos "annotated-" anteriores se existirem
    originalName = originalName.replace(/^annotated-/, '')
    
    // Se não há nome original, usar um padrão
    if (!originalName || originalName === 'documento.pdf') {
      originalName = 'material.pdf'
    }
    
    // Preservar o nome do arquivo original para não ser removido
    const originalFileName = originalName
    
    console.log('📄 Nome original processado:', originalFileName)
    
    const fileName = `${timestamp}-annotated-${originalName}`
    const filePath = path.join(uploadsDir, fileName)
    
    console.log('💾 Salvando arquivo em:', filePath)
    console.log('📁 Arquivo original preservado:', originalFileName)
    
    // Salvar o arquivo
    await writeFile(filePath, Buffer.from(pdfBuffer))
    
    // Limpar arquivos antigos (preservando o original)
    await cleanupOldFiles(materialId, fileName, originalFileName)
    
    // Criar URL relativa
    const pdfUrl = `/api/uploads/${fileName}`
    
    console.log('🔄 Atualizando material no banco de dados...')
    console.log('🔗 Nova URL do PDF:', pdfUrl)
    
    // Atualizar o material com o novo arquivo
    await prisma.materialEstudo.update({
      where: { id: materialId },
      data: {
        arquivoPdfUrl: pdfUrl
      }
    })

    console.log('✅ Material atualizado com sucesso!')

    return NextResponse.json({
      success: true,
      pdfUrl,
      message: 'PDF salvo com anotações incorporadas'
    })

  } catch (error) {
    console.error('❌ Erro ao salvar PDF com anotações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 