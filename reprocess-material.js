const materialId = 'cmjymezjz0007c99rjvn3gnp1'

console.log('🚀 Reprocessando material:', materialId)
console.log('\nPara reprocessar, execute:')
console.log(`\ncurl -X POST http://localhost:3030/api/pdf/start-background-processing \\
  -H "Content-Type: application/json" \\
  -d '{"materialId": "${materialId}"}'`)

console.log('\n✅ O sistema agora:')
console.log('1. Detectará que lastProcessedPage = 95')
console.log('2. Verificará que [PAGE_1] não existe')
console.log('3. Resetará automaticamente o processamento')
console.log('4. Processará todas as páginas desde o início')
console.log('5. Com os logs detalhados, veremos exatamente o que acontece')
