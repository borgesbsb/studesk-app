import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generateShortHash(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function main() {
  const email = 'iverlucebss@gmail.com'

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, hash: true }
  })

  if (!user) {
    console.log('Usuário não encontrado!')
    return
  }

  console.log(`Usuário encontrado: ${user.email}`)
  console.log(`Hash atual: ${user.hash?.substring(0, 20)}...`)

  const newHash = generateShortHash(10)
  console.log(`Novo hash: ${newHash}`)

  await prisma.user.update({
    where: { id: user.id },
    data: { hash: newHash }
  })

  console.log(`\n✅ Hash atualizado com sucesso!`)
  console.log(`Novo URL: /${newHash}/hoje`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
