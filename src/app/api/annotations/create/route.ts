import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    // }

    // Parse do body
    const body = await request.json()
    console.log('📥 Recebido body:', JSON.stringify(body, null, 2))
    const { materialId, texto, startOffset, endOffset, cor, tipo, pagina, metadata } = body

    // Validações
    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId é obrigatório' },
        { status: 400 }
      )
    }

    // Validação específica por tipo
    if (tipo === 'freehand') {
      // Desenho à mão livre: validar metadata
      if (!metadata || !metadata.paths || !Array.isArray(metadata.paths)) {
        return NextResponse.json(
          { error: 'metadata.paths é obrigatório para desenhos' },
          { status: 400 }
        )
      }
    } else {
      // Anotações de texto: validar texto e offsets
      if (!texto || texto.trim().length === 0) {
        return NextResponse.json(
          { error: 'texto é obrigatório' },
          { status: 400 }
        )
      }

      if (startOffset === undefined || endOffset === undefined) {
        return NextResponse.json(
          { error: 'startOffset e endOffset são obrigatórios' },
          { status: 400 }
        )
      }

      if (startOffset < 0 || endOffset < 0 || endOffset <= startOffset) {
        return NextResponse.json(
          { error: 'Offsets inválidos' },
          { status: 400 }
        )
      }
    }

    // Verificar se material pertence ao usuário (SEM verificação de userId para POC)
    const material = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        // userId: session.user.id,  // COMENTADO PARA POC
      },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Criar anotação
    const anotacao = await prisma.anotacao.create({
      data: {
        materialId,
        texto: tipo === 'freehand' ? '' : texto.trim(),
        startOffset: tipo === 'freehand' ? 0 : startOffset,
        endOffset: tipo === 'freehand' ? 0 : endOffset,
        cor: cor || '#ffff00', // Amarelo padrão
        tipo: tipo || 'highlight', // Tipo padrão
        pagina: pagina || 0, // Número da página (usado em freehand)
        metadata: metadata || undefined, // Dados adicionais (paths para freehand, etc)
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: anotacao.id,
        materialId: anotacao.materialId,
        texto: anotacao.texto,
        startOffset: anotacao.startOffset,
        endOffset: anotacao.endOffset,
        cor: anotacao.cor,
        tipo: anotacao.tipo,
        createdAt: anotacao.createdAt,
        updatedAt: anotacao.updatedAt,
      },
    })
  } catch (error) {
    console.error('❌ ERRO COMPLETO ao criar anotação:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
      console.error('Message:', error.message)
    }
    return NextResponse.json(
      {
        error: 'Erro ao criar anotação',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
