# Data Intelligence Assistant — Text-to-SQL

> Chat interativo que converte perguntas em linguagem natural em consultas SQL, executa no banco SQLite e apresenta os resultados com síntese do Gemini, tabela paginada e gráficos dinâmicos.

---

## Arquitetura

```
text-to-sql/
├── backend/                  # API Python (FastAPI)
│   ├── main.py               # Endpoints FastAPI + CORS + lifecycle
│   ├── gemini_service.py     # Integração Google Gemini + SQL Security Guard
│   ├── database.py           # Geração do banco SQLite + execução de queries
│   ├── test_backend.py       # Testes de integração do backend
│   ├── requirements.txt      # Dependências Python
│   └── .env                  # Chave GEMINI_API_KEY (não versionado)
└── frontend/                 # Interface Next.js (App Router)
    ├── app/
    │   ├── page.js           # Página principal (chat feed + lógica de estado)
    │   ├── layout.js         # Layout raiz (metadados, fontes)
    │   └── globals.css       # Design system (glassmorphism, tokens CSS)
    └── components/
        ├── Header.jsx        # Barra superior com status do backend
        ├── ChatInput.jsx     # Input de perguntas + sugestões rápidas
        ├── QueryResponseView.jsx  # Card de resposta (SQL, síntese, tabela/gráfico)
        ├── DynamicChart.jsx  # Gráficos dinâmicos com Recharts (barras/linha/pizza)
        └── SecurityBadge.jsx # Card de erro para bloqueios HTTP 403
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS v4 + Recharts |
| Backend | FastAPI + Uvicorn |
| IA | Google Gemini (gemini-3-flash-preview) via SDK `google-genai` |
| Banco de dados | SQLite (`vendas_ficticias.db` — 150 registros gerados automaticamente) |

---

## Pré-requisitos

- Python 3.11+
- Node.js 18+
- Chave de API do Google Gemini (`GEMINI_API_KEY`)

---

## Setup e execução

### 1. Backend (FastAPI)

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Criar o arquivo .env com sua chave
echo GEMINI_API_KEY=sua_chave_aqui > .env

> **Nota:** Se a chave atingir limite de requisições (HTTP 429), insira uma chave ativa do Google AI Studio na variável GEMINI_API_KEY dentro de backend/.env.

# Iniciar o servidor (porta 8000)
python -m uvicorn main:app --reload
```

O banco `vendas_ficticias.db` é gerado automaticamente no primeiro startup.

### 2. Frontend (Next.js)

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento (porta 3000)
npm run dev
```

Acesse **http://localhost:3000**

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Health check — verifica se a API e o banco estão operacionais |
| `POST` | `/api/query` | Recebe `{ "pergunta": "..." }` e retorna SQL, síntese, colunas e linhas |

### Exemplo de resposta (`POST /api/query`)

```json
{
  "sql": "SELECT produto, SUM(total) AS faturamento FROM vendas GROUP BY produto ORDER BY faturamento DESC",
  "sintese": "A consulta percorre todos os registros da tabela vendas e agrupa as linhas por produto...",
  "columns": ["produto", "faturamento"],
  "rows": [["Notebook Gamer", 85500.0], ["Monitor 4K", 42000.0]],
  "total_registros": 8
}
```

---

## Segurança (SQL Mutation Guard)

O backend bloqueia com **HTTP 403** qualquer SQL que contenha comandos de mutação (`DROP`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `TRUNCATE`, etc.).  
Apenas `SELECT` e `WITH` (CTEs) são permitidos.

---

## Testes

```bash
cd backend
python test_backend.py
```

---

## Limitações Conhecidas & Evolução para Produção (Roadmap)

Este projeto foi construído como um protótipo de demonstração técnica sobre um banco de dados reduzido. Em um cenário de produção, as seguintes evoluções devem ser consideradas:

1. **Paginação em Nível de Banco de Dados:**
   - *Atual:* A consulta SQL retorna os registros filtrados ao backend e a paginação é tratada na camada de apresentação.
   - *Produção:* Implementar paginação no SQLite (`LIMIT` e `OFFSET`) para suportar milhões de linhas sem sobrecarregar a memória da API.

2. **Dicionário de Dados e Pipeline RAG:**
   - *Atual:* O esquema DDL das tabelas é injetado diretamente na instrução de sistema da LLM.
   - *Produção:* Para schemas complexos com dezenas de tabelas, utilizar uma estratégia de RAG (Retrieval-Augmented Generation) para recuperar dinamicamente apenas as tabelas/colunas relevantes para a pergunta.

3. **Timeouts e Resiliência de Queries:**
   - *Atual:* As instruções `SELECT` / `WITH` validadas são executadas diretamente.
   - *Produção:* Adicionar limite de tempo de execução (*query timeout*) no driver do banco para evitar travamentos em queries muito pesadas.

4. **Cache de Consultas:**
   - *Atual:* Cada pergunta processa uma chamada à LLM e ao banco.
   - *Produção:* Implementar camada de cache (ex: Redis) indexando as perguntas frequentes e hashes de queries para otimizar tempo de resposta e reduzir custos de tokens.
