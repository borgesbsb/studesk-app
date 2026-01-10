import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OpenAIFormatService } from '@/application/services/openai-format.service'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

export async function POST(request: NextRequest) {
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    // }

    // Parse do body
    const body = await request.json()
    const { materialId } = body

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar material (SEM verificação de userId para POC)
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

    // Se já existe texto formatado, retornar do cache
    if (material.mobileText) {
      return NextResponse.json({
        success: true,
        cached: true,
        data: {
          id: material.mobileText.id,
          materialId: material.mobileText.materialId,
          formattedText: material.mobileText.formattedText,
          tokensUsed: material.mobileText.tokensUsed,
          processedAt: material.mobileText.processedAt,
        },
      })
    }

    // Verificar se é PDF
    if (material.tipo !== 'PDF' || !material.arquivoPdfUrl) {
      return NextResponse.json(
        { error: 'Material não é um PDF válido' },
        { status: 400 }
      )
    }

    // Extrair texto do PDF
    const pdfPath = path.join(process.cwd(), 'public', material.arquivoPdfUrl)

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'Arquivo PDF não encontrado' },
        { status: 404 }
      )
    }

    const dataBuffer = fs.readFileSync(pdfPath)
    const pdfData = await pdfParse(dataBuffer)
    const rawText = pdfData.text

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto do PDF' },
        { status: 400 }
      )
    }

    // Formatar com OpenAI
    const formatService = new OpenAIFormatService()

    // Decidir se processa em chunks ou não (>20k caracteres = chunks)
    const shouldUseChunks = rawText.length > 20000
    const result = shouldUseChunks
      ? await formatService.formatTextInChunks(rawText)
      : await formatService.formatTextForMobile(rawText)

    // Salvar no banco
    const mobileText = await prisma.pdfMobileText.create({
      data: {
        materialId: material.id,
        formattedText: result.formattedText,
        rawText: rawText,
        aiModel: result.model,
        tokensUsed: result.tokensUsed,
      },
    })

    return NextResponse.json({
      success: true,
      cached: false,
      data: {
        id: mobileText.id,
        materialId: mobileText.materialId,
        formattedText: mobileText.formattedText,
        tokensUsed: mobileText.tokensUsed,
        processedAt: mobileText.processedAt,
      },
    })
  } catch (error) {
    console.error('Erro ao formatar PDF:', error)
    return NextResponse.json(
      {
        error: 'Erro ao processar PDF',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
