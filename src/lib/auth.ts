import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // Adapter removido - não é compatível com CredentialsProvider
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 [AUTH] Iniciando autorização...')
        console.log('🔐 [AUTH] Email recebido:', credentials?.email)

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ [AUTH] Credenciais incompletas')
          throw new Error('Email e senha são obrigatórios')
        }

        console.log('🔐 [AUTH] Buscando usuário no banco...')
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          console.log('❌ [AUTH] Usuário não encontrado:', credentials.email)
          throw new Error('Usuário não encontrado')
        }

        console.log('🔐 [AUTH] Usuário encontrado:', user.email, 'Hash:', user.hash)
        console.log('🔐 [AUTH] Verificando senha...')

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          console.log('❌ [AUTH] Senha inválida')
          throw new Error('Senha inválida')
        }

        console.log('✅ [AUTH] Autenticação bem-sucedida! User ID:', user.id)

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
      console.log('🎫 [JWT] Callback chamado')
      if (user) {
        console.log('🎫 [JWT] Novo usuário logado, adicionando ao token:', user.id)
        token.id = user.id
        token.hash = (user as any).hash
      }
      console.log('🎫 [JWT] Token gerado com hash:', token.hash)
      return token
    },
    async session({ session, token }) {
      console.log('👤 [SESSION] Callback chamado')
      if (session.user) {
        session.user.id = token.id as string
        session.user.hash = token.hash as string
        console.log('👤 [SESSION] Sessão criada para usuário:', session.user.id, 'Hash:', session.user.hash)
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      console.log('🔀 [REDIRECT] Callback chamado')
      console.log('🔀 [REDIRECT] URL:', url)
      console.log('🔀 [REDIRECT] BaseURL:', baseUrl)

      // Se o usuário acabou de fazer login, obter o hash do token para redirecionar
      // Para isso, precisamos garantir que redirecionamos para a URL com hash
      if (url === baseUrl || url.startsWith(baseUrl + '/login')) {
        console.log('🔀 [REDIRECT] Redirecionando para root (middleware vai redirecionar para /{hash}/hoje)')
        return baseUrl
      }
      console.log('🔀 [REDIRECT] Redirecionando para:', url)
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
  // Usar configuração padrão de cookies do NextAuth
  // Em desenvolvimento/localhost não usa secure, o Nginx cuida do HTTPS
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Habilita logs detalhados do NextAuth
  logger: {
    error(code, metadata) {
      console.error('❌ [NEXTAUTH ERROR]', code, metadata)
    },
    warn(code) {
      console.warn('⚠️ [NEXTAUTH WARN]', code)
    },
    debug(code, metadata) {
      console.log('🐛 [NEXTAUTH DEBUG]', code, metadata)
    }
  }
}
