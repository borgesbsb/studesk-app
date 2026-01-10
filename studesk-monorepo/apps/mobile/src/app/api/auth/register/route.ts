import { prisma } from '@studesk/database'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function POST(request: NextRequest) {
  const corsHeaders = handleCors(request)

  try {
    const { name, email, password } = await request.json()

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Todos os campos são obrigatórios' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email já cadastrado' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Hash da senha
    const hashedPassword = await hash(password, 10)

    // Criar usuário com hash único usando crypto nativo
    const userHash = randomBytes(5).toString('hex')

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        hash: userHash,
      },
    })

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          hash: user.hash,
        },
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { message: 'Erro ao criar conta. Tente novamente.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
