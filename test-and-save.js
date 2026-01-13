const https = require('http');

const data = JSON.stringify({
  materialId: 'cmjm98x060001c9wqri24taxc',
  startPage: 1,
  endPage: 3,
  batchSize: 3
});

const options = {
  hostname: 'localhost',
  port: 3030,
  path: '/api/pdf/process-batch',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(responseData);
      const extractedText = json.batch.text;

      // Save to file
      const fs = require('fs');
      fs.writeFileSync('extracted-text-proper.txt', extractedText, 'utf8');

      console.log('✅ Texto salvo em extracted-text-proper.txt');
      console.log(`\n📊 Total de caracteres: ${extractedText.length}`);
      console.log(`📊 Total de \\n simples: ${(extractedText.match(/\n(?!\n)/g) || []).length}`);
      console.log(`📊 Total de \\n\\n duplos: ${(extractedText.match(/\n\n/g) || []).length}`);
      console.log('\n=== PRIMEIROS 500 CARACTERES ===\n');
      console.log(extractedText.substring(0, 500));
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      console.error('Resposta bruta:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Erro na requisição:', error);
});

req.write(data);
req.end();
