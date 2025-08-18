const { PrismaClient } = require('@prisma/client');

async function checkOpenAIConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Verificando configuração OpenAI no banco...');
    
    const config = await prisma.openAIConfig.findFirst();
    
    if (!config) {
      console.log('❌ Nenhuma configuração OpenAI encontrada no banco');
      console.log('Você precisa cadastrar uma API key da OpenAI');
    } else {
      console.log('✅ Configuração OpenAI encontrada:');
      console.log('- ID:', config.id);
      console.log('- Modelo:', config.model);
      console.log('- Temperature:', config.temperature);
      console.log('- Max Tokens:', config.maxTokens);
      console.log('- API Key presente:', !!config.apiKey);
      console.log('- API Key preview:', config.apiKey ? `${config.apiKey.substring(0, 8)}...` : 'não configurada');
    }
    
  } catch (error) {
    console.error('Erro ao verificar configuração:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOpenAIConfig();
