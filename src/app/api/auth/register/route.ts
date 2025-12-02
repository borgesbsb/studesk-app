import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { generateUniqueHash } from '@/lib/user-hash'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    // Validações
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Gerar hash único para o usuário
    const userHash = await generateUniqueHash()

    // Hash da senha
    const hashedPassword = await hash(password, 10)

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        hash: userHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        hash: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'Usuário criado com sucesso!'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao registrar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
