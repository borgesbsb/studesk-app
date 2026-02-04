import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    // Verificar se já existe algum admin
    const adminCount = await prisma.admin.count()

    if (adminCount > 0) {
      console.log('❌ Já existe um administrador cadastrado')
      console.log(`Total de admins: ${adminCount}`)
      process.exit(1)
    }

    // Criar primeiro admin com senha padrão
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.admin.create({
      data: {
        email: 'admin@studesk.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'super_admin'
      }
    })

    console.log('✅ Primeiro administrador criado com sucesso!')
    console.log('')
    console.log('📧 Email: admin@studesk.com')
    console.log('🔑 Senha: admin123')
    console.log('')
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!')
    console.log('')
    console.log('🌐 Acesse: http://localhost:3030/admin/login')

  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
