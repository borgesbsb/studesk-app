const fs = require('fs');

// Read the extracted text
const text = fs.readFileSync('extracted-text.txt', 'utf8');

console.log('=== ANÁLISE DE PARÁGRAFOS ===\n');

// Count line breaks
const singleBreaks = (text.match(/\n(?!\n)/g) || []).length;
const doubleBreaks = (text.match(/\n\n/g) || []).length;

console.log(`Total de quebras simples (\\n): ${singleBreaks}`);
console.log(`Total de quebras duplas (\\n\\n) = parágrafos: ${doubleBreaks}`);

console.log('\n=== PRIMEIROS 1000 CARACTERES ===\n');
console.log(text.substring(0, 1000));

console.log('\n\n=== VISUALIZAÇÃO COM MARCADORES ===\n');
// Replace line breaks with visible markers
const visible = text.substring(0, 1000)
  .replace(/\n\n/g, '⏎⏎[PARÁGRAFO]⏎⏎')
  .replace(/\n/g, '⏎[LINHA]⏎');

console.log(visible);
