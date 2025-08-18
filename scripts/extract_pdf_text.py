#!/usr/bin/env python3
import os
import sys
import json
from PyPDF2 import PdfReader
from typing import List, Dict

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extrai texto de um arquivo PDF."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Erro ao processar {pdf_path}: {str(e)}")
        return ""

def save_text(text: str, output_path: str) -> None:
    """Salva o texto extraído em um arquivo."""
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Texto salvo em: {output_path}")
    except Exception as e:
        print(f"Erro ao salvar texto: {str(e)}")

def main():
    if len(sys.argv) < 2:
        print("Uso: python extract_pdf_text.py <caminho_do_pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Arquivo não encontrado: {pdf_path}")
        sys.exit(1)

    # Extrai o texto
    print(f"Processando: {pdf_path}")
    text = extract_text_from_pdf(pdf_path)
    
    # Define o caminho de saída
    filename = os.path.splitext(os.path.basename(pdf_path))[0]
    output_path = os.path.join('public/uploads/fine-tuning/extracted', f"{filename}.txt")
    
    # Salva o texto
    save_text(text, output_path)

if __name__ == "__main__":
    main() 