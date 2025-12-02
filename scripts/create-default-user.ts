import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Criando usuário padrão...')

  const email = 'borges.bnjmin@gmail.com'
  const password = '123456'
  const name = 'Benjamin Borges'

  // Verificar se usuário já existe
  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    console.log('✅ Usuário já existe!')
    console.log('📧 Email:', existing.email)
    console.log('🔑 Hash:', existing.hash)
    console.log(`🌐 URL: http://localhost:3030/${existing.hash}/hoje`)
    return
  }

  // Criar hash único
  const userHash = nanoid(10)

  // Hash da senha
  const hashedPassword = await hash(password, 10)

  // Criar usuário
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      hash: userHash,
    }
  })

  console.log('✅ Usuário criado com sucesso!')
  console.log('📧 Email:', user.email)
  console.log('🔑 Senha:', password)
  console.log('🆔 Hash:', user.hash)
  console.log(`🌐 URL: http://localhost:3030/${user.hash}/hoje`)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
