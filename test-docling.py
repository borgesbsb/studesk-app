#!/usr/bin/env python3
"""
Teste de conversão de PDF com Docling
"""
import time
from docling.document_converter import DocumentConverter

pdf_path = "public/uploads/cmiojz4340001c9r0iwdq6obx/e8aHER8vty2zov4ngJ4BR_curso-244688-aula-00-a0d3-completo.pdf"

print("🚀 Iniciando conversão com Docling...")
print(f"📄 Arquivo: {pdf_path}")
print()

start_time = time.time()

# Converter PDF
converter = DocumentConverter()
result = converter.convert(pdf_path)

conversion_time = time.time() - start_time

# Exportar para Markdown
markdown = result.document.export_to_markdown()

total_time = time.time() - start_time

# Estatísticas
print(f"✅ Conversão concluída!")
print(f"⏱️  Tempo de conversão: {conversion_time:.2f}s")
print(f"⏱️  Tempo total: {total_time:.2f}s")
print(f"📊 Tamanho do markdown: {len(markdown):,} caracteres")
print(f"📊 Palavras: {len(markdown.split()):,}")
print()
print("📝 Primeiras 1000 caracteres:")
print("-" * 80)
print(markdown[:1000])
print("-" * 80)
