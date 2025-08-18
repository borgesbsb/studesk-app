console.log('Testando extração de texto...');

// Testar se conseguimos ler o arquivo
const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'public', 'uploads', '1748530379637-GESTÃO-DE-PROJETOS.pdf');

try {
  const stats = fs.statSync(pdfPath);
  console.log('✅ PDF encontrado:', stats.size, 'bytes');
  
  // Verificar se é um PDF válido
  const buffer = fs.readFileSync(pdfPath);
  const header = buffer.slice(0, 4).toString();
  console.log('Cabeçalho:', header);
  
  if (header === '%PDF') {
    console.log('✅ PDF válido');
    
    // Testar extração com pdf-parse
    const pdfParse = require('pdf-parse');
    
    pdfParse(buffer).then(data => {
      console.log('✅ PDF-PARSE funciona!');
      console.log('Páginas:', data.numpages);
      console.log('Caracteres:', data.text.length);
      console.log('Primeiros 300 chars:', data.text.substring(0, 300));
    }).catch(err => {
      console.error('❌ Erro pdf-parse:', err.message);
    });
    
  } else {
    console.log('❌ Não é um PDF válido');
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}
