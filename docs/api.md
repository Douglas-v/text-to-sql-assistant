# API Reference

Documentação interativa (Swagger) em `http://localhost:8000/docs` com o backend rodando.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status da API e se o DDL foi carregado no startup |
| `POST` | `/api/query` | Recebe `{ "pergunta": "..." }` (5–500 caracteres), gera o SQL com o Gemini, valida, executa e retorna dados + síntese |

## `POST /api/query`

```json
{
  "sql": "SELECT produto, SUM(quantidade) AS total_vendido FROM vendas GROUP BY produto ORDER BY total_vendido DESC LIMIT 3;",
  "sintese": "Os três produtos mais vendidos em quantidade são ...",
  "columns": ["produto", "total_vendido"],
  "rows": [["Notebook Gamer", 42], ["Monitor 4K", 38], ["Headset 7.1", 31]],
  "total_registros": 3
}
```

> Os valores acima são ilustrativos: os dados são gerados aleatoriamente na primeira execução.

## Códigos de erro

| Status | Causa |
|--------|-------|
| `400` | O Gemini retornou algo que não é JSON válido |
| `403` | SQL bloqueado pelo guard (mutação ou query que não inicia com `SELECT`/`WITH`) |
| `422` | Payload inválido (ex.: pergunta com menos de 5 caracteres) |
| `500` | Falha de comunicação com o Gemini ou erro de execução no SQLite |

## Camadas de segurança

1. **Pré-checagem da pergunta (demonstração):** palavras de mutação evidentes na pergunta (`DELETE`, `DROP TABLE`, ...) disparam o guard antes de chamar o Gemini. Alimenta o botão "Teste de Segurança" da interface.
2. **SQL Guard (regex):** bloqueia comandos de mutação em qualquer posição e exige que a query comece com `SELECT` ou `WITH`. É heurístico (pode ter falsos positivos, por exemplo uma string literal contendo `create`); por isso é a segunda camada.
3. **Conexão SQLite somente leitura (`mode=ro`):** a barreira real. Mesmo que o guard falhe, o driver rejeita qualquer escrita; e o `sqlite3` do Python rejeita múltiplos statements por chamada.
