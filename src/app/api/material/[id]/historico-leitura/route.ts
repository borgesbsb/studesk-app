import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const materialId = id

    console.log('📚 API - Buscando histórico de leitura:', { materialId })

    // Busca o histórico de leitura ordenado por data
    const historico = await prisma.historicoLeitura.findMany({
      where: { materialId },
      orderBy: { dataLeitura: 'desc' },
      select: {
        id: true,
        paginaAtual: true,
        tempoLeituraSegundos: true,
        assuntosEstudados: true,
        dataLeitura: true,
        createdAt: true
      }
    })

    console.log('✅ API - Histórico encontrado:', { count: historico.length })

    return NextResponse.json({ 
      success: true, 
      historico
    })
  } catch (error) {
    console.error('❌ API - Erro ao buscar histórico de leitura:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de leitura' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { sessaoId, assuntosEstudados } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('📝 API - Atualizando assuntos da sessão:', { 
      materialId, 
      sessaoId, 
      assuntosEstudados 
    })

    // Verifica se a sessão existe e pertence ao material
    const sessaoExistente = await prisma.historicoLeitura.findFirst({
      where: { 
        id: sessaoId,
        materialId: materialId
      }
    })

    if (!sessaoExistente) {
      console.log('❌ API - Sessão não encontrada:', { sessaoId, materialId })
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Atualiza os assuntos estudados
    const sessaoAtualizada = await prisma.historicoLeitura.update({
      where: { id: sessaoId },
      data: {
        assuntosEstudados: assuntosEstudados || null
      }
    })

    console.log('✅ API - Assuntos da sessão atualizados:', sessaoAtualizada)

    return NextResponse.json({ 
      success: true, 
      sessao: sessaoAtualizada,
      message: 'Assuntos atualizados com sucesso'
    })
  } catch (error) {
    console.error('❌ API - Erro ao atualizar assuntos da sessão:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar assuntos da sessão' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { paginaAtual, tempoLeituraSegundos, assuntosEstudados } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('📝 API - Salvando histórico de leitura:', { 
      materialId, 
      paginaAtual, 
      tempoLeituraSegundos, 
      assuntosEstudados 
    })

    // Verifica se o material existe
    const materialExistente = await prisma.materialEstudo.findUnique({
      where: { id: materialId },
      select: { id: true, nome: true, totalPaginas: true }
    })

    if (!materialExistente) {
      console.log('❌ API - Material não encontrado:', materialId)
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Valida os dados
    if (!Number.isInteger(paginaAtual) || paginaAtual < 1 || paginaAtual > materialExistente.totalPaginas) {
      return NextResponse.json(
        { error: 'Página atual inválida' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(tempoLeituraSegundos) || tempoLeituraSegundos < 0) {
      return NextResponse.json(
        { error: 'Tempo de leitura inválido' },
        { status: 400 }
      )
    }

    // Cria o registro no histórico de leitura
    const historicoLeitura = await prisma.historicoLeitura.create({
      data: {
        materialId,
        paginaAtual,
        tempoLeituraSegundos,
        assuntosEstudados: assuntosEstudados || null,
        dataLeitura: new Date()
      }
    })

    console.log('✅ API - Histórico de leitura salvo:', historicoLeitura)

    const mensagem = assuntosEstudados 
      ? `Sessão de estudo salva: página ${paginaAtual}, ${Math.floor(tempoLeituraSegundos / 60)}min ${tempoLeituraSegundos % 60}s, assuntos registrados`
      : `Histórico de leitura salvo: página ${paginaAtual}, ${Math.floor(tempoLeituraSegundos / 60)}min ${tempoLeituraSegundos % 60}s`

    return NextResponse.json({ 
      success: true, 
      historicoLeitura,
      message: mensagem
    })
  } catch (error) {
    console.error('❌ API - Erro ao salvar histórico de leitura:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar histórico de leitura' },
      { status: 500 }
    )
  }
} 

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { sessaoId } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('🗑️ API - Excluindo mini sessão:', { 
      materialId, 
      sessaoId 
    })

    if (!sessaoId) {
      return NextResponse.json(
        { error: 'ID da sessão é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a sessão existe e pertence ao material
    const sessaoExistente = await prisma.historicoLeitura.findFirst({
      where: { 
        id: sessaoId,
        materialId: materialId
      }
    })

    if (!sessaoExistente) {
      return NextResponse.json(
        { error: 'Mini sessão não encontrada' },
        { status: 404 }
      )
    }

    // Deletar a mini sessão
    await prisma.historicoLeitura.delete({
      where: { id: sessaoId }
    })

    console.log('✅ API - Mini sessão excluída com sucesso:', {
      sessaoId,
      materialId
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Mini sessão excluída com sucesso'
    })
  } catch (error) {
    console.error('❌ API - Erro ao excluir mini sessão:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir mini sessão' },
      { status: 500 }
    )
  }
} 