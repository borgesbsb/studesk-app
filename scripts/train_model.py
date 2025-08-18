#!/usr/bin/env python3
import os
import json
import openai
from typing import List, Dict
import time

def read_text_file(file_path: str) -> str:
    """Lê o conteúdo de um arquivo de texto."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def create_training_data(text: str) -> List[Dict]:
    """Cria dados de treinamento no formato JSONL."""
    # Divide o texto em parágrafos
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    training_data = []
    for p in paragraphs:
        # Cria um exemplo de treinamento para cada parágrafo
        if len(p) > 30:  # Ignora parágrafos muito curtos
            training_data.append({
                "messages": [
                    {"role": "system", "content": "Você é um assistente especializado em concursos públicos."},
                    {"role": "user", "content": "O que você sabe sobre este assunto?"},
                    {"role": "assistant", "content": p}
                ]
            })
    return training_data

def save_training_file(data: List[Dict], output_path: str) -> None:
    """Salva os dados de treinamento em formato JSONL."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

def train_model(training_file_path: str, api_key: str) -> str:
    """Inicia o treinamento do modelo."""
    client = openai.OpenAI(api_key=api_key)
    
    # Upload do arquivo de treinamento
    with open(training_file_path, 'rb') as f:
        response = client.files.create(
            file=f,
            purpose='fine-tune'
        )
    file_id = response.id
    print(f"Arquivo de treinamento enviado. ID: {file_id}")
    
    # Espera o arquivo estar pronto
    print("Aguardando processamento do arquivo...")
    while True:
        file_status = client.files.retrieve(file_id)
        if file_status.status == "processed":
            break
        elif file_status.status == "error":
            print(f"Erro no processamento do arquivo: {file_status}")
            return None
        time.sleep(2)
    
    # Inicia o fine-tuning
    response = client.fine_tuning.jobs.create(
        training_file=file_id,
        model="gpt-4-1106-preview"
    )
    job_id = response.id
    print(f"Treinamento iniciado. Job ID: {job_id}")
    
    return job_id

def check_training_status(job_id: str, api_key: str) -> None:
    """Verifica o status do treinamento."""
    client = openai.OpenAI(api_key=api_key)
    
    while True:
        try:
            response = client.fine_tuning.jobs.retrieve(job_id)
            status = response.status
            print(f"Status: {status}")
            
            if hasattr(response, 'trained_tokens') and response.trained_tokens:
                print(f"Progresso: {response.trained_tokens} tokens treinados")
            
            if status in ['succeeded', 'failed', 'cancelled']:
                if status == 'succeeded':
                    print(f"✅ Modelo treinado com sucesso: {response.fine_tuned_model}")
                elif status == 'failed':
                    print(f"❌ Treinamento falhou: {response.error}")
                else:
                    print(f"⚠️ Treinamento cancelado")
                break
                
        except Exception as e:
            print(f"Erro ao verificar status: {e}")
            break
            
        time.sleep(30)  # Verifica a cada 30 segundos

def main():
    # Verifica argumentos
    if len(os.sys.argv) != 3:
        print("Uso: python train_model.py <caminho_do_texto> <api_key>")
        print("Exemplo: python train_model.py arquivo.txt sk-...")
        os.sys.exit(1)
    
    text_path = os.sys.argv[1]
    api_key = os.sys.argv[2]
    
    if not os.path.exists(text_path):
        print(f"❌ Arquivo não encontrado: {text_path}")
        os.sys.exit(1)
    
    # Lê o texto
    print(f"📖 Lendo arquivo: {text_path}")
    text = read_text_file(text_path)
    print(f"📝 Arquivo lido: {len(text)} caracteres")
    
    # Cria dados de treinamento
    print("🔧 Criando dados de treinamento...")
    training_data = create_training_data(text)
    print(f"📊 Criados {len(training_data)} exemplos de treinamento")
    
    if len(training_data) < 10:
        print("⚠️ Poucos dados de treinamento. Recomendado pelo menos 10 exemplos.")
    
    # Salva arquivo de treinamento
    filename = os.path.splitext(os.path.basename(text_path))[0]
    training_file = os.path.join('public/uploads/fine-tuning/training', f"{filename}.jsonl")
    save_training_file(training_data, training_file)
    print(f"💾 Arquivo de treinamento salvo: {training_file}")
    
    # Inicia treinamento
    print("🚀 Iniciando treinamento...")
    job_id = train_model(training_file, api_key)
    
    if job_id:
        # Monitora status
        print("👀 Monitorando status do treinamento...")
        check_training_status(job_id, api_key)
    else:
        print("❌ Falha ao iniciar o treinamento")

if __name__ == "__main__":
    main() 