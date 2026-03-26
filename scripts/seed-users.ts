import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { generateUniqueHash } from '../src/lib/user-hash'

const prisma = new PrismaClient()

async function main() {
  // Admin
  const adminEmail = 'admin@studesk.com'
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        password: await hash('admin123', 10),
        role: 'super_admin',
      },
    })
    console.log('Admin criado:', adminEmail)
  } else {
    console.log('Admin já existe:', adminEmail)
  }

  // Usuário comum
  const userEmail = 'borgesbsb.dev@gmail.com'
  const existingUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!existingUser) {
    const userHash = await generateUniqueHash()
    await prisma.user.create({
      data: {
        name: 'Benjamin Borges',
        email: userEmail,
        password: await hash('B12905629g', 10),
        hash: userHash,
      },
    })
    console.log('Usuário criado:', userEmail)
  } else {
    console.log('Usuário já existe:', userEmail)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
