const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com o banco de dados...');
    console.log('📍 DATABASE_URL:', process.env.DATABASE_URL);

    await prisma.$connect();
    console.log('✅ Conexão com o banco estabelecida com sucesso!');

    // Testa uma query simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query de teste executada:', result);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:');
    console.error(error.message);
    console.error('\n📋 Detalhes do erro:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
