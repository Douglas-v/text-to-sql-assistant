# Data Intelligence Assistant — Text-to-SQL

> Chat interativo que converte perguntas em linguagem natural em consultas SQL otimizadas, executa-as em um banco SQLite e apresenta os resultados com síntese inteligente do Google Gemini, tabelas paginadas, gráficos dinâmicos e controle de segurança contra mutações de dados.

---

## Principais Recursos

- **Chat Feed Interativo com Histórico:** Interface em formato de conversa contínua com carimbo de data/hora (*timestamps*), botão para limpar o histórico e sugestões rápidas de perguntas.
- **SQL Security Mutation Guard (HTTP 403):** Camada de segurança rigorosa que inspeciona toda query SQL gerada. Bloqueia com status HTTP 403 qualquer comando de alteração de dados (`DROP`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, `TRUNCATE`, etc.), permitindo exclusivamente consultas de leitura (`SELECT` e `WITH`).
- **Síntese de Inteligência com Gemini 3 Flash:** Conexão otimizada via SDK `google-genai` com respostas estruturadas em JSON contendo o código SQL limpo e uma síntese amigável.
- **Visualização Gráfica Dinâmica & Tabela Paginada:** Alternância simples entre tabela paginada (10 itens por página) e gráficos interativos (Barras, Linhas/Área ou Donut) desenvolvidos com Recharts.
- **Formatação Inteligente de Dados (PT-BR):** Módulo centralizado (`formatters.js`) para tradução automática de colunas `snake_case` para português, formatação de valores monetários (R$), datas no padrão `DD/MM/AAAA` (sem desvio de fuso horário) e distinção entre valores de moeda e quantidades.
- **Exportação de Dados para CSV:** Botão integrado na visualização de dados para exportação imediata das consultas em formato `.csv`.
- **Otimização do Esquema do Banco de Dados:** O DDL é carregado na memória assim que a API é iniciada. Com isso, o backend não precisa consultar o banco de dados toda vez que o Gemini for gerar uma query, deixando a resposta mais rápida.
- **Monitoramento de Saúde (Health Check):** Endpoint `GET /api/health` para verificação de status do backend e banco, com indicador dinâmico no cabeçalho.

---

## Arquitetura

```
text-to-sql/
├── backend/                  # API Python (FastAPI)
│   ├── main.py               # Endpoints FastAPI, CORS, lifespan e cache de DDL
│   ├── gemini_service.py     # SDK google-genai, prompt do sistema e SQL Security Guard
│   ├── database.py           # Geração idempotente do SQLite (150 registros) e execução de queries
│   ├── test_backend.py       # Testes unitários do SQL Guard e testes de integração da API
│   ├── requirements.txt      # Dependências Python
│   └── .env                  # Chave GEMINI_API_KEY (não versionado)
└── frontend/                 # Interface Next.js (App Router)
    ├── app/
    │   ├── page.js           # Página principal (Chat feed, histórico e estado global)
    │   ├── layout.js         # Layout raiz (metadados, fontes)
    │   └── globals.css       # Design System (Glassmorphism, tokens CSS, utilitários)
    ├── components/
    │   ├── QueryResponseView.jsx  # Card de resposta (Síntese, SQL, Tabela, Gráfico e CSV)
    │   ├── charts/
    │   │   └── DynamicChart.jsx   # Gráficos dinâmicos (Barras, Linhas e Donut)
    │   └── ui/
    │       ├── Header.jsx        # Barra superior com status do backend e badges
    │       ├── ChatInput.jsx     # Campo de mensagem + sugestões rápidas
    │       └── SecurityBadge.jsx # Card visual para bloqueios de segurança HTTP 403
    └── lib/
        └── formatters.js     # Utilitários de tradução, datas PT-BR e moedas
```

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Recharts + Lucide Icons |
| **Backend** | FastAPI + Uvicorn + Pydantic v2 |
| **IA** | Google Gemini API (`gemini-3-flash-preview`) via SDK oficial `google-genai` |
| **Banco de Dados** | SQLite (`vendas_ficticias.db` — 150 registros fictícios gerados de forma idempotente) |

---

## Pré-requisitos

- **Python 3.11+**
- **Node.js 18+**
- **Chave de API do Google Gemini** (`GEMINI_API_KEY`)

---

## Setup e Execução

### 1. Backend (FastAPI)

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Criar o arquivo .env com sua chave da Gemini API
echo GEMINI_API_KEY=sua_chave_aqui > .env

# Executar a suíte de testes (opcional)
python test_backend.py

# Iniciar o servidor de desenvolvimento (porta 8000)
python -m uvicorn main:app --reload
```

> **Nota:** O banco `vendas_ficticias.db` é criado e populado automaticamente na primeira inicialização da aplicação. Se a sua chave atingir o limite de cota (HTTP 429), substitua a variável `GEMINI_API_KEY` em `backend/.env`.

### 2. Frontend (Next.js)

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento (porta 3000)
npm run dev
```

Acesse **http://localhost:3000** no seu navegador.

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Health Check — Verifica se a API está operacional e se o DDL foi carregado no startup |
| `POST` | `/api/query` | Recebe `{ "pergunta": "..." }`, consulta o Gemini, valida o SQL e retorna os dados brutos e a síntese |

### Exemplo de Resposta (`POST /api/query`)

```json
{
  "sql": "SELECT produto, SUM(quantidade) AS total_vendido FROM vendas GROUP BY produto ORDER BY total_vendido DESC LIMIT 3;",
  "sintese": "Os três produtos mais vendidos em quantidade total são Notebook Gamer, Monitor 4K e Headset 7.1.",
  "columns": ["produto", "total_vendido"],
  "rows": [
    ["Notebook Gamer", 42],
    ["Monitor 4K", 38],
    ["Headset 7.1", 31]
  ],
  "total_registros": 3
}
```

---

## Segurança (SQL Mutation Guard)

O backend possui uma camada dupla de proteção que bloqueia com status **HTTP 403** qualquer instrução que possa modificar o banco de dados (`DROP`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, `TRUNCATE`, `REPLACE`, `MERGE`, etc.).

1. **Inspecção Prévia de Intenção:** Intercepta comandos de mutação evidentes enviadas no próprio texto da pergunta antes de chamar o Gemini.
2. **Validação de Sintaxe SQL:** Analisa via expressão regular se a query gerada começa obrigatoriamente com `SELECT` ou `WITH` e se contém apenas comandos de consulta de dados.

---

## Testes

O backend conta com uma suíte de testes cobrindo o guard de segurança e a integração dos endpoints:

```bash
cd backend
python test_backend.py
```

---

## Limitações Conhecidas & Evolução para Produção (Roadmap)

Este projeto foi desenvolvido como um protótipo funcional de alta qualidade técnica. Para migração para ambiente de produção de grande escala, recomenda-se considerar:

1. **Paginação em Nível de Banco de Dados (`LIMIT` / `OFFSET`):**
   - *Atual:* A query SQL executa no banco e a paginação gráfica é feita na camada de apresentação (10 itens por página).
   - *Produção:* Injetar cláusulas de paginação diretamente na instrução SQL em buscas que retornem milhares de registros para otimizar transferência de dados e consumo de memória.

2. **Pipeline RAG e Dicionário de Dados Avançado:**
   - *Atual:* O esquema DDL completo da tabela é mantido em cache de memória e injetado no `system_instruction` do Gemini.
   - *Produção:* Para esquemas complexos com dezenas de tabelas e relacionamentos, utilizar um mecanismo de RAG (Retrieval-Augmented Generation) com busca vetorial para recuperar dinamicamente apenas as tabelas pertinentes.

3. **Timeouts e Limite de Recursos na Consulta SQL:**
   - *Atual:* Consultas válidas são executadas diretamente pela conexão SQLite.
   - *Produção:* Configurar limites de tempo de execução (*query timeout*) e isolamento de sessão no driver do banco de dados para prevenir negação de serviço por queries excessivamente pesadas.

4. **Camada de Caching (ex: Redis):**
   - *Atual:* Toda pergunta gera uma requisição à API do Gemini e uma consulta ao SQLite.
   - *Produção:* Implementar cache de respostas frequentes indexando hashes de perguntas e tabelas alteradas para reduzir custo de tokens e tempo de resposta.
