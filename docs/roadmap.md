# Limitações conhecidas e caminho para produção

Protótipo funcional, construído sobre uma base fictícia. Itens para levá-lo a produção:

| # | Tema | Hoje | Em produção |
|---|------|------|-------------|
| 1 | Paginação | Feita no frontend (10 itens/página) | `LIMIT`/`OFFSET` no SQL para resultados grandes |
| 2 | Schema grande | DDL completo em cache, injetado no `system_instruction` | RAG com busca vetorial para recuperar só as tabelas relevantes |
| 3 | Timeout de query | Sem limite de tempo | Query timeout e isolamento de sessão |
| 4 | Cache | Cada pergunta chama o Gemini e o SQLite | Cache de respostas por hash da pergunta (ex.: Redis) |
| 5 | Autenticação e rate limit | API aberta | Autenticação, quotas por usuário e rate limiting |
| 6 | Avaliação de acurácia | Validação manual | Dataset de perguntas com SQL esperado (*execution accuracy*) rodando no CI |
| 7 | Containerização | Execução manual (venv + npm) | `Dockerfile` + `docker-compose.yml` (planejado) |
| 8 | Guard SQL | Regex + conexão somente leitura | Parser SQL real (ex.: `sqlglot`) para validar a AST |
| 9 | Síntese baseada nos dados | O Gemini gera SQL e síntese na mesma chamada, antes da execução; a síntese descreve a consulta, não os valores retornados | Segunda chamada enviando as linhas (amostra) ao modelo para resumir o resultado real |
