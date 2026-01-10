import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE annotation route

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  try {
    console.log('🗑️ DELETE /api/annotations/delete/[annotationId] - Iniciando...')

    const session = await getServerSession(authOptions)
    console.log('👤 Sessão:', session?.user?.id ? 'Autenticado' : 'Não autenticado')

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const { annotationId } = await params
    console.log('📝 Annotation ID recebido:', annotationId)

    if (!annotationId) {
      return NextResponse.json(
        { success: false, error: 'ID da anotação não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se a anotação pertence ao usuário
    console.log('🔍 Buscando anotação no banco...')
    const annotation = await prisma.anotacao.findUnique({
      where: { id: annotationId },
      include: {
        material: {
          select: {
            userId: true,
          },
        },
      },
    })

    console.log('📋 Anotação encontrada:', annotation ? 'SIM' : 'NÃO')

    if (!annotation) {
      console.log('❌ Anotação não encontrada')
      return NextResponse.json(
        { success: false, error: 'Anotação não encontrada' },
        { status: 404 }
      )
    }

    console.log('👤 User ID da anotação:', annotation.material.userId)
    console.log('👤 User ID da sessão:', session.user.id)

    if (annotation.material.userId !== session.user.id) {
      console.log('⛔ Sem permissão para deletar')
      return NextResponse.json(
        { success: false, error: 'Sem permissão para deletar esta anotação' },
        { status: 403 }
      )
    }

    // Deletar a anotação
    console.log('🗑️ Deletando anotação...')
    await prisma.anotacao.delete({
      where: { id: annotationId },
    })

    console.log('✅ Anotação deletada com sucesso!')
    return NextResponse.json({
      success: true,
      message: 'Anotação deletada com sucesso',
    })
  } catch (error) {
    console.error('❌ ERRO COMPLETO ao deletar anotação:', error)
    console.error('Tipo do erro:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json(
      { success: false, error: 'Erro ao deletar anotação' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
