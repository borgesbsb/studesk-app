const fs = require('fs');
const path = require('path');

async function testPdfExtraction() {
  console.log('=== TESTE DE EXTRAÇÃO PDF ===');
  
  // Testar se o arquivo existe
  const pdfPath = path.join(__dirname, 'public', 'uploads', '1748530379637-GESTÃO-DE-PROJETOS.pdf');
  console.log('Caminho do PDF:', pdfPath);
  
  try {
    const stats = fs.statSync(pdfPath);
    console.log('✅ Arquivo encontrado! Tamanho:', stats.size, 'bytes');
  } catch (error) {
    console.error('❌ Arquivo não encontrado:', error.message);
    return;
  }

  // Testar pdf-parse
  console.log('\n=== TESTANDO PDF-PARSE ===');
  try {
    const buffer = fs.readFileSync(pdfPath);
    console.log('✅ Buffer carregado:', buffer.length, 'bytes');
    
    const pdfParse = require('pdf-parse');
    console.log('✅ pdf-parse importado');
    
    const data = await pdfParse(buffer);
    console.log('✅ PDF processado com pdf-parse:');
    console.log('- Páginas:', data.numpages);
    console.log('- Caracteres:', data.text.length);
    console.log('- Primeiros 200 chars:', data.text.substring(0, 200));
    
  } catch (error) {
    console.error('❌ Erro com pdf-parse:', error.message);
  }
}

testPdfExtraction().catch(console.error);
