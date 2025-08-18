import { NextRequest, NextResponse } from 'next/server'
import { ChunkCacheService } from '@/services/chunk-cache.service'

export async function GET(request: NextRequest) {
  try {
    console.log('Buscando estatísticas do cache de chunks...')

    const estatisticas = await ChunkCacheService.estatisticasCache()

    return NextResponse.json({
      success: true,
      data: estatisticas
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas do cache:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('Limpando cache antigo...')

    // Buscar parâmetro de dias da query string
    const url = new URL(request.url)
    const diasParam = url.searchParams.get('dias')
    const dias = diasParam ? parseInt(diasParam) : 30

    if (isNaN(dias) || dias < 1) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetro "dias" deve ser um número positivo'
      }, { status: 400 })
    }

    const chunksRemovidos = await ChunkCacheService.limparCacheAntigo(dias)

    return NextResponse.json({
      success: true,
      message: `${chunksRemovidos} chunks removidos do cache`,
      chunksRemovidos,
      diasLimite: dias
    })

  } catch (error) {
    console.error('Erro ao limpar cache:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 