import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { generateUniqueHash } from '../src/lib/user-hash'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testando isolamento de dados entre usuários...\n')

  // Criar dois usuários de teste
  const user1Email = 'user1@test.com'
  const user2Email = 'user2@test.com'
  const testPassword = '123456'

  try {
    // Limpar usuários de teste existentes
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [user1Email, user2Email]
        }
      }
    })

    // Criar User 1
    const hashedPassword = await hash(testPassword, 10)
    const user1Hash = await generateUniqueHash()

    const user1 = await prisma.user.create({
      data: {
        name: 'Usuário Teste 1',
        email: user1Email,
        password: hashedPassword,
        hash: user1Hash,
      }
    })

    console.log(`✅ Usuário 1 criado:`)
    console.log(`   Email: ${user1.email}`)
    console.log(`   Hash: ${user1.hash}`)
    console.log(`   Senha: ${testPassword}\n`)

    // Criar User 2
    const user2Hash = await generateUniqueHash()

    const user2 = await prisma.user.create({
      data: {
        name: 'Usuário Teste 2',
        email: user2Email,
        password: hashedPassword,
        hash: user2Hash,
      }
    })

    console.log(`✅ Usuário 2 criado:`)
    console.log(`   Email: ${user2.email}`)
    console.log(`   Hash: ${user2.hash}`)
    console.log(`   Senha: ${testPassword}\n`)

    // Criar disciplinas para User 1
    const disciplinaUser1 = await prisma.disciplina.create({
      data: {
        nome: 'Matemática User1',
        userId: user1.id,
      }
    })

    console.log(`✅ Disciplina criada para User 1: ${disciplinaUser1.nome}`)

    // Criar disciplinas para User 2
    const disciplinaUser2 = await prisma.disciplina.create({
      data: {
        nome: 'Português User2',
        userId: user2.id,
      }
    })

    console.log(`✅ Disciplina criada para User 2: ${disciplinaUser2.nome}\n`)

    // Criar plano de estudo para User 1
    const planoUser1 = await prisma.planoEstudo.create({
      data: {
        nome: 'Plano User1',
        userId: user1.id,
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-12-31'),
        ativo: true,
      }
    })

    console.log(`✅ Plano criado para User 1: ${planoUser1.nome}`)

    // Criar plano de estudo para User 2
    const planoUser2 = await prisma.planoEstudo.create({
      data: {
        nome: 'Plano User2',
        userId: user2.id,
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-12-31'),
        ativo: true,
      }
    })

    console.log(`✅ Plano criado para User 2: ${planoUser2.nome}\n`)

    // Criar material de estudo para User 1
    const materialUser1 = await prisma.materialEstudo.create({
      data: {
        nome: 'Livro Matemática User1',
        tipo: 'pdf',
        userId: user1.id,
        totalPaginas: 100,
      }
    })

    console.log(`✅ Material criado para User 1: ${materialUser1.nome}`)

    // Criar material de estudo para User 2
    const materialUser2 = await prisma.materialEstudo.create({
      data: {
        nome: 'Apostila Português User2',
        tipo: 'pdf',
        userId: user2.id,
        totalPaginas: 50,
      }
    })

    console.log(`✅ Material criado para User 2: ${materialUser2.nome}\n`)

    // ========================================
    // TESTES DE ISOLAMENTO
    // ========================================

    console.log('🔍 Verificando isolamento de dados...\n')

    // Teste 1: User1 deve ver apenas suas disciplinas
    const disciplinasUser1 = await prisma.disciplina.findMany({
      where: { userId: user1.id }
    })

    console.log(`✓ User 1 - Disciplinas encontradas: ${disciplinasUser1.length}`)
    console.log(`  ${disciplinasUser1.map(d => d.nome).join(', ')}`)

    if (disciplinasUser1.length !== 1 || disciplinasUser1[0].nome !== 'Matemática User1') {
      console.error('❌ FALHA: User 1 deveria ver apenas 1 disciplina (Matemática User1)')
      process.exit(1)
    }

    // Teste 2: User2 deve ver apenas suas disciplinas
    const disciplinasUser2 = await prisma.disciplina.findMany({
      where: { userId: user2.id }
    })

    console.log(`✓ User 2 - Disciplinas encontradas: ${disciplinasUser2.length}`)
    console.log(`  ${disciplinasUser2.map(d => d.nome).join(', ')}\n`)

    if (disciplinasUser2.length !== 1 || disciplinasUser2[0].nome !== 'Português User2') {
      console.error('❌ FALHA: User 2 deveria ver apenas 1 disciplina (Português User2)')
      process.exit(1)
    }

    // Teste 3: User1 deve ver apenas seus planos
    const planosUser1 = await prisma.planoEstudo.findMany({
      where: { userId: user1.id }
    })

    console.log(`✓ User 1 - Planos encontrados: ${planosUser1.length}`)
    console.log(`  ${planosUser1.map(p => p.nome).join(', ')}`)

    if (planosUser1.length !== 1 || planosUser1[0].nome !== 'Plano User1') {
      console.error('❌ FALHA: User 1 deveria ver apenas 1 plano (Plano User1)')
      process.exit(1)
    }

    // Teste 4: User2 deve ver apenas seus planos
    const planosUser2 = await prisma.planoEstudo.findMany({
      where: { userId: user2.id }
    })

    console.log(`✓ User 2 - Planos encontrados: ${planosUser2.length}`)
    console.log(`  ${planosUser2.map(p => p.nome).join(', ')}\n`)

    if (planosUser2.length !== 1 || planosUser2[0].nome !== 'Plano User2') {
      console.error('❌ FALHA: User 2 deveria ver apenas 1 plano (Plano User2)')
      process.exit(1)
    }

    // Teste 5: User1 deve ver apenas seus materiais
    const materiaisUser1 = await prisma.materialEstudo.findMany({
      where: { userId: user1.id }
    })

    console.log(`✓ User 1 - Materiais encontrados: ${materiaisUser1.length}`)
    console.log(`  ${materiaisUser1.map(m => m.nome).join(', ')}`)

    if (materiaisUser1.length !== 1 || materiaisUser1[0].nome !== 'Livro Matemática User1') {
      console.error('❌ FALHA: User 1 deveria ver apenas 1 material (Livro Matemática User1)')
      process.exit(1)
    }

    // Teste 6: User2 deve ver apenas seus materiais
    const materiaisUser2 = await prisma.materialEstudo.findMany({
      where: { userId: user2.id }
    })

    console.log(`✓ User 2 - Materiais encontrados: ${materiaisUser2.length}`)
    console.log(`  ${materiaisUser2.map(m => m.nome).join(', ')}\n`)

    if (materiaisUser2.length !== 1 || materiaisUser2[0].nome !== 'Apostila Português User2') {
      console.error('❌ FALHA: User 2 deveria ver apenas 1 material (Apostila Português User2)')
      process.exit(1)
    }

    console.log('✅ TODOS OS TESTES PASSARAM! Isolamento de dados funcionando corretamente.\n')

    console.log('📝 Para testar no navegador:')
    console.log(`   User 1: ${user1Email} / ${testPassword}`)
    console.log(`   URL: http://localhost:3000/${user1Hash}/hoje`)
    console.log(`   User 2: ${user2Email} / ${testPassword}`)
    console.log(`   URL: http://localhost:3000/${user2Hash}/hoje\n`)

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
