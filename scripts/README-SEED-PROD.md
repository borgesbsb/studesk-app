# 📚 Scripts de Carga - Área Fiscal (Produção)

Scripts para carregar disciplinas, PDFs e vídeos do Google Drive para o ambiente de produção.

---

## 📋 Scripts Disponíveis

### 1. `1-seed-prod-disciplinas.mjs`
Cria as 10 disciplinas no banco de dados.

### 2. `2-seed-prod-pdfs.mjs`
Lista e copia PDFs do Google Drive, cadastra no banco e associa às disciplinas.

### 3. `3-seed-prod-videos.mjs`
Lista vídeos e cadastra apenas metadados (vídeos ficam no Google Drive).

---

## 🚀 Como Executar

### **Pré-requisitos no Servidor**

✅ Node.js e npm
✅ rclone configurado com Google Drive
✅ PostgreSQL rodando
✅ Aplicação Next.js em `/var/www/studesk-app`

### **Passo 1: Copiar scripts para o servidor**

Do seu computador local:

```bash
cd /home/borgesbsb/projetos/studesk-app/studesk

scp scripts/1-seed-prod-disciplinas.mjs root@195.35.17.216:/var/www/studesk-app/scripts/
scp scripts/2-seed-prod-pdfs.mjs root@195.35.17.216:/var/www/studesk-app/scripts/
scp scripts/3-seed-prod-videos.mjs root@195.35.17.216:/var/www/studesk-app/scripts/
```

### **Passo 2: Configurar rclone no servidor**

SSH no servidor:

```bash
ssh root@195.35.17.216
```

Verificar se rclone está configurado:

```bash
rclone listremotes
# Deve mostrar: Google-Drive:
```

**Se não estiver configurado**, copie a configuração do seu computador:

```bash
# Do seu computador local
scp ~/.config/rclone/rclone.conf root@195.35.17.216:~/.config/rclone/
```

### **Passo 3: Executar scripts na ordem**

No servidor (`ssh root@195.35.17.216`):

```bash
cd /var/www/studesk-app

# 1. Criar disciplinas
node scripts/1-seed-prod-disciplinas.mjs

# 2. Carregar PDFs (modo teste: 5 PDFs por disciplina)
node scripts/2-seed-prod-pdfs.mjs

# 3. Carregar vídeos (modo teste: 5 vídeos por disciplina)
node scripts/3-seed-prod-videos.mjs
```

---

## 📊 Modos de Execução

### **Modo TESTE** (Padrão)
- PDFs: 5 por disciplina (~50 PDFs total)
- Vídeos: 5 por disciplina (~50 vídeos total)
- Rápido para testar o processo

### **Modo PRODUÇÃO (FULL)**

Para carregar TODOS os materiais, edite os scripts:

**`2-seed-prod-pdfs.mjs` (linha 23):**
```javascript
const MODE = 'full' // Mude de 'test' para 'full'
```

**`3-seed-prod-videos.mjs` (linha 24):**
```javascript
const MODE = 'full' // Mude de 'test' para 'full'
```

Depois execute novamente:

```bash
node scripts/2-seed-prod-pdfs.mjs  # ~340 PDFs (pode levar 30-60 min)
node scripts/3-seed-prod-videos.mjs # ~1.498 vídeos (apenas metadados, ~5-10 min)
```

---

## 📊 Dados que serão carregados

| Disciplina | PDFs | Vídeos |
|------------|------|--------|
| Auditoria | 16 | 0 |
| Contabilidade Geral | 27 | 0 |
| Direito Administrativo | 39 | 249 |
| Direito Constitucional | 38 | 265 |
| Direito Previdenciário | 4 | 6 |
| Direito Tributário | 48 | 143 |
| Economia e Finanças Públicas | 23 | 165 |
| Estatística | 31 | 311 |
| Língua Portuguesa | 20 | 229 |
| Raciocínio Lógico Matemático | 18 | 130 |
| **TOTAL** | **~340** | **~1.498** |

---

## 🔍 Saída Esperada

### Script 1 - Disciplinas
```
📚 Criando disciplinas - Área Fiscal

🔍 Buscando usuário borgesbsb.dev@gmail.com...
✅ Usuário encontrado: clxxx...

📝 Criando disciplinas...

✅ Auditoria                         ID: clxxx...
✅ Contabilidade Geral              ID: clxxx...
...
============================================================
✅ Total de disciplinas: 10
============================================================
```

### Script 2 - PDFs
```
📄 Carregando PDFs - Área Fiscal (modo: test)

✅ Usuário: clxxx...
✅ 10 disciplinas encontradas

============================================================
📖 Auditoria
============================================================
  🔍 Listando PDFs...
  ✅ 16 PDFs encontrados
  📥 Processando 5 PDFs...

    ✅ [1] curso-244704-aula-00-4cc6-completo.pdf
    ✅ [2] curso-244704-aula-01-3336-completo.pdf
    ...

============================================================
📊 RESUMO DA CARGA DE PDFs
============================================================
✅ Sucesso:  50
❌ Erro:     0
📄 Total:    50
============================================================
```

### Script 3 - Vídeos
```
🎬 Carregando Vídeos (metadados) - Área Fiscal (modo: test)

✅ Usuário: clxxx...
✅ 10 disciplinas encontradas

============================================================
📖 Direito Administrativo
============================================================
  🔍 Listando vídeos (.mp4)...
  ✅ 249 vídeos encontrados
  📹 Cadastrando 5 vídeos (apenas metadados)...

    ✅ [1] 16-Projetos.mp4
    ✅ [2] 15-Obras-e-Serviços-de-Engenharia.mp4
    ...

============================================================
📊 RESUMO DA CARGA DE VÍDEOS
============================================================
✅ Sucesso:  35
❌ Erro:     0
🎬 Total:    35
============================================================

📌 Nota: Vídeos ficam no Google Drive, apenas metadados foram salvos
```

---

## 🐛 Troubleshooting

### Erro: "Usuário não encontrado"
```bash
# Verificar se usuário existe no banco
cd /var/www/studesk-app
npx prisma studio
# Abrir navegador e verificar tabela User
```

### Erro: "rclone command not found"
```bash
curl https://rclone.org/install.sh | sudo bash
```

### Erro: "Failed to copy"
```bash
# Testar conexão com Google Drive
rclone lsf "Google-Drive:Área Fiscal" --max-depth 1
```

### Erro: "Nenhuma disciplina encontrada"
```bash
# Executar primeiro o script 1
node scripts/1-seed-prod-disciplinas.mjs
```

---

## ✅ Verificação pós-carga

```bash
# 1. Verificar disciplinas criadas
npx prisma studio
# Abrir navegador e verificar tabelas:
# - Disciplina (10 registros)
# - MaterialEstudo (PDFs + vídeos)
# - DisciplinaMaterial (associações)

# 2. Verificar PDFs copiados
ls -lh /var/www/studesk-app/public/uploads/[userId]/

# 3. Testar API
curl https://studesk.pro/api/disciplinas
```

---

## 📝 Notas Importantes

1. **PDFs são copiados** para `/var/www/studesk-app/public/uploads/[userId]`
2. **Vídeos NÃO são copiados**, ficam no Google Drive
3. **Modo teste** processa apenas 5 materiais por disciplina
4. **Scripts são idempotentes**: Verificam duplicatas antes de inserir
5. **Ordem de execução**: Sempre 1 → 2 → 3

---

## 🎯 Próximos Passos

Após carga bem-sucedida:
1. ✅ Verificar materiais no Prisma Studio
2. ✅ Testar leitura de PDFs no app mobile
3. 🔄 Implementar player de vídeo (streaming do Google Drive)
4. 🔄 Build APK final com URL de produção
