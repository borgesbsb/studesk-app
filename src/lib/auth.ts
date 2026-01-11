import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // Adapter removido - não é compatível com CredentialsProvider
  // adapter: PrismaAdapter(prisma),
  // Confiar nos headers do proxy (Nginx)
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          throw new Error('Usuário não encontrado')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Senha inválida')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          hash: user.hash,
          image: user.image,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.hash = (user as any).hash
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.hash = token.hash as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Se o usuário acabou de fazer login, obter o hash do token para redirecionar
      // Para isso, precisamos garantir que redirecionamos para a URL com hash
      if (url === baseUrl || url.startsWith(baseUrl + '/login')) {
        // Redirecionar para root, o middleware vai cuidar de redirecionar para /{hash}/hoje
        return baseUrl
      }
      return url
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 horas
    updateAge: 24 * 60 * 60, // Atualiza a sessão a cada 24 horas
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 horas
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // Em produção, usar secure: true para HTTPS
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 24 horas em segundos
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}
