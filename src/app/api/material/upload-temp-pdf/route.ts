import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const materialId = formData.get('materialId') as string | null

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo fornecido' },
                { status: 400 }
            )
        }

        // Validar tipo de arquivo
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Apenas arquivos PDF são permitidos' },
                { status: 400 }
            )
        }

        // Criar diretório temporário se não existir
        const tempDir = join(process.cwd(), 'public', 'temp-uploads')
        if (!existsSync(tempDir)) {
            await mkdir(tempDir, { recursive: true })
        }

        // Gerar nome único para o arquivo
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(7)
        const fileName = `${timestamp}-${randomStr}-${file.name}`
        const filePath = join(tempDir, fileName)

        // Converter file para buffer e salvar
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Retornar URL do arquivo temporário
        const fileUrl = `/temp-uploads/${fileName}`

        return NextResponse.json({
            success: true,
            fileUrl,
            fileName: file.name,
            size: file.size
        })
    } catch (error) {
        console.error('Erro ao fazer upload:', error)
        return NextResponse.json(
            { error: 'Erro ao processar upload' },
            { status: 500 }
        )
    }
}
