# StudesDk - Sistema de Geração de Questões com IA

## 🎯 Nova Funcionalidade: Geração com Processamento IA

O sistema agora permite gerar questões a partir de texto usando inteligência artificial para:
- Limpar e organizar o conteúdo
- Extrair tópicos relevantes
- Gerar questões de alta qualidade

### 📝 Como usar com texto

#### Endpoint: `POST /api/questoes/gerar-com-ia`

```json
{
  "materialId": "optional-material-id",
  "texto": "Seu texto educacional aqui...",
  "quantidade": 5,
  "promptPersonalizado": "Instruções específicas (opcional)",
  "tituloSessao": "Título da sessão (opcional)",
  "descricaoSessao": "Descrição da sessão (opcional)",
  "apiKey": "sua-chave-openai (opcional)"
}
```

#### Exemplo de requisição:

```bash
curl -X POST http://localhost:3000/api/questoes/gerar-com-ia \
  -H "Content-Type: application/json" \
  -H "x-openai-key: sua-chave-api" \
  -d '{
    "texto": "A gestão de projetos é uma disciplina que envolve o planejamento, execução e controle de projetos. Os principais conceitos incluem escopo, cronograma, recursos e qualidade.",
    "quantidade": 3,
    "tituloSessao": "Questões sobre Gestão de Projetos"
  }'
```

#### Resposta:

```json
{
  "questoes": [
    {
      "pergunta": "Qual é o principal objetivo da gestão de projetos?",
      "alternativaA": "Maximizar lucros",
      "alternativaB": "Planejar, executar e controlar projetos",
      "alternativaC": "Reduzir custos",
      "alternativaD": "Aumentar vendas",
      "respostaCorreta": "B",
      "explicacao": "A gestão de projetos visa planejar, executar e controlar projetos de forma eficiente."
    }
  ],
  "sessaoId": "session-id",
  "estatisticasFiltragem": "Texto processado pela IA: 150 → 120 caracteres. Tokens usados: 45",
  "message": "3 questões geradas com sucesso usando processamento IA"
}
```

### 🔄 Fluxo do Sistema

1. **Recepção do Texto**: O sistema recebe o texto bruto
2. **Processamento com IA**: OpenAI limpa e organiza o conteúdo
3. **Geração de Questões**: Cria questões baseadas no texto processado
4. **Salvamento**: Armazena as questões no banco de dados

### ⚙️ Configurações

- **API Key**: Pode ser enviada no header `x-openai-key` ou no body
- **Quantidade**: Padrão é 5 questões
- **Temperatura IA**: 0.3 para processamento consistente
- **Modelo**: gpt-3.5-turbo

### 📊 Logs e Monitoramento

O sistema fornece logs detalhados de:
- Tamanho do texto recebido
- Progresso do processamento IA
- Tokens utilizados
- Estatísticas de redução de texto
- Questões geradas

### 🛠️ Tecnologias

- **Next.js 15.3.2**
- **OpenAI API**
- **Prisma ORM**
- **TypeScript**

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
