import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Buscar TODOS os materiais
    const materials = await prisma.materialEstudo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Por enquanto, vamos assumir que nenhum foi formatado
    // TODO: Depois que o Prisma Client for atualizado, usar prisma.pdfMobileText.findMany()
    const mobileTextMap = new Map()

    const formatted = materials.map((material) => ({
      id: material.id,
      nome: material.nome,
      totalPaginas: material.totalPaginas || 0,
      hasFormattedText: mobileTextMap.has(material.id),
      tipo: material.tipo,
      arquivoPdfUrl: material.arquivoPdfUrl,
      arquivoVideoUrl: material.arquivoVideoUrl,
      fonteOrigem: material.fonteOrigem,
    }))

    console.log('=== DEBUG: Materiais encontrados ===')
    console.log('Total:', formatted.length)
    console.log('Detalhes:', JSON.stringify(formatted, null, 2))

    return NextResponse.json({
      success: true,
      materials: formatted,
      totalCount: formatted.length,
    })
  } catch (error) {
    console.error('Erro ao listar materiais:', error)
    return NextResponse.json(
      {
        error: 'Erro ao listar materiais',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
