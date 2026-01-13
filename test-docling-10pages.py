#!/usr/bin/env python3
"""
Teste de conversão de PDF com Docling - Primeiras 5 páginas
"""
import time
import os
from pathlib import Path
from docling.document_converter import DocumentConverter

# Usar caminho absoluto
pdf_path = Path(os.getcwd()) / "public/uploads/cmiojz4340001c9r0iwdq6obx/e8aHER8vty2zov4ngJ4BR_curso-244688-aula-00-a0d3-completo.pdf"

print("🚀 Iniciando conversão com Docling (5 primeiras páginas)...")
print(f"📄 Arquivo: {pdf_path}")
print(f"📂 Existe: {pdf_path.exists()}")
print()

start_time = time.time()

# Converter PDF com limite de 5 páginas (usando page_range)
converter = DocumentConverter()
result = converter.convert(str(pdf_path), page_range=(1, 5))

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
print(f"📊 Linhas: {len(markdown.splitlines()):,}")
print()
print("📝 Primeiras 1500 caracteres:")
print("-" * 80)
print(markdown[:1500])
print("-" * 80)

# Salvar resultado
output_file = "/tmp/docling-10pages-result.md"
with open(output_file, 'w') as f:
    f.write(markdown)
print(f"\n💾 Resultado salvo em: {output_file}")
