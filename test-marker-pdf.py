#!/usr/bin/env python3
"""
Script de teste para marker-pdf
Converte PDF em Markdown usando marker-pdf
"""

import sys
import os
from pathlib import Path
import time

def test_marker_pdf(pdf_path: str, output_path: str = None):
    """
    Testa a conversão de PDF para Markdown com marker-pdf

    Args:
        pdf_path: Caminho para o arquivo PDF
        output_path: Caminho para salvar o Markdown (opcional)
    """
    print(f"🔄 Iniciando conversão do PDF: {pdf_path}")
    print(f"📊 Tamanho do arquivo: {os.path.getsize(pdf_path) / 1024:.2f} KB")

    try:
        from marker.convert import convert_single_pdf
        from marker.models import load_all_models

        print("\n📦 Carregando modelos do marker-pdf...")
        start_load = time.time()
        model_lst = load_all_models()
        load_time = time.time() - start_load
        print(f"✅ Modelos carregados em {load_time:.2f}s")

        print("\n🚀 Convertendo PDF para Markdown...")
        start_convert = time.time()

        # Converter PDF para Markdown
        full_text, images, out_meta = convert_single_pdf(
            pdf_path,
            model_lst
        )

        convert_time = time.time() - start_convert

        print(f"\n✅ Conversão completa em {convert_time:.2f}s")
        print(f"📝 Tamanho do texto: {len(full_text)} caracteres")
        print(f"🖼️  Imagens extraídas: {len(images)}")
        print(f"📄 Páginas processadas: {out_meta.get('pages', 'N/A')}")

        # Salvar markdown
        if not output_path:
            output_path = pdf_path.replace('.pdf', '_marker.md')

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(full_text)

        print(f"\n💾 Markdown salvo em: {output_path}")

        # Mostrar preview do markdown
        print("\n📖 Preview do Markdown (primeiros 500 caracteres):")
        print("-" * 80)
        print(full_text[:500])
        print("-" * 80)

        # Estatísticas finais
        print(f"\n📊 Estatísticas:")
        print(f"   • Tempo total: {load_time + convert_time:.2f}s")
        print(f"   • Palavras: ~{len(full_text.split())}")
        print(f"   • Linhas: {full_text.count(chr(10))}")

        return {
            'success': True,
            'markdown': full_text,
            'output_path': output_path,
            'stats': {
                'load_time': load_time,
                'convert_time': convert_time,
                'total_time': load_time + convert_time,
                'chars': len(full_text),
                'words': len(full_text.split()),
                'lines': full_text.count('\n'),
                'images': len(images),
                'pages': out_meta.get('pages', 0)
            }
        }

    except ImportError as e:
        print(f"\n❌ Erro: marker-pdf não está instalado")
        print(f"   Detalhes: {e}")
        print(f"\n💡 Instale com: pip install marker-pdf")
        return {'success': False, 'error': str(e)}

    except Exception as e:
        print(f"\n❌ Erro durante conversão: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    # Caminho padrão do PDF
    default_pdf = "public/uploads/fine-tuning/cmbjnv2gf0000c95a11vtocd9/fine-tuning-cmbjnv2gf0000c95a11vtocd9-1749325128073-CAA---QUESTÕES---ATUALIZADA-EM-26.05.25.pdf"

    # Permitir passar PDF como argumento
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else default_pdf

    # Verificar se arquivo existe
    if not os.path.exists(pdf_path):
        print(f"❌ Erro: Arquivo não encontrado: {pdf_path}")
        sys.exit(1)

    # Executar teste
    result = test_marker_pdf(pdf_path)

    # Status final
    if result['success']:
        print("\n✅ TESTE CONCLUÍDO COM SUCESSO!")
        sys.exit(0)
    else:
        print("\n❌ TESTE FALHOU!")
        sys.exit(1)
