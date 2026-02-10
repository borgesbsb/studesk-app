import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sign } from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    console.log('🔐 [LOGIN API] Tentativa de login:', email);

    // Validações
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ [LOGIN API] Usuário não encontrado:', email);
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    // Verificar senha
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ [LOGIN API] Senha inválida para:', email);
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    const token = sign(
      {
        id: user.id,
        email: user.email,
        hash: user.hash,
      },
      secret,
      { expiresIn: '30d' }
    );

    console.log('✅ [LOGIN API] Login bem-sucedido:', email);

    // Retornar usuário e token
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hash: user.hash,
        image: user.image,
      },
      token,
    });
  } catch (error) {
    console.error('❌ [LOGIN API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
