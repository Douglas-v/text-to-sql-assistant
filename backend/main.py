# ============================================================
# main.py — Aplicação FastAPI: endpoints, CORS e orquestração
# ============================================================
# Responsabilidades:
#   1. Inicializar a aplicação FastAPI com configuração de CORS
#   2. Gerar o banco de dados e pré-carregar o DDL no startup
#   3. Expor os endpoints da API:
#        GET  /api/health  → Verificação de saúde da API
#        POST /api/query   → Fluxo Text-to-SQL completo
# ============================================================

import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import gerar_dados, get_ddl, executar_query
from gemini_service import processar_pergunta


# ── Estado global da aplicação ───────────────────────────────────────────────

# O DDL é carregado uma única vez no startup e reutilizado em todas as
# requisições, evitando leituras repetidas ao SQLite a cada chamada.
_ddl_cache: str = ""


# ── Lifecycle da Aplicação (startup / shutdown) ──────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia o ciclo de vida da aplicação.

    No startup:
      - Garante que o banco de dados existe (gerar_dados é idempotente).
      - Carrega e armazena o DDL em cache para uso nas requisições.

    No shutdown:
      - Recursos assíncronos podem ser liberados aqui se necessário.
    """
    global _ddl_cache

    print("[startup] Inicializando banco de dados...")
    gerar_dados()

    print("[startup] Carregando DDL do banco para cache...")
    _ddl_cache = get_ddl()
    print(f"[startup] DDL carregado ({len(_ddl_cache)} caracteres).")

    yield  # A aplicação fica ativa entre o yield e o bloco abaixo

    print("[shutdown] Encerrando aplicação.")


# ── Criação da Aplicação FastAPI ─────────────────────────────────────────────

app = FastAPI(
    title="Text-to-SQL API — Data Intelligence Assistant",
    description=(
        "API que converte perguntas em linguagem natural em consultas SQL "
        "usando o Google Gemini, executando-as com segurança em um banco SQLite."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ── Configuração de CORS ─────────────────────────────────────────────────────

# Permite que o frontend Next.js (rodando em localhost:3000) acesse a API.
# Em produção, substitua "*" pelo domínio real do frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas Pydantic (request / response) ────────────────────────────────────

class QueryRequest(BaseModel):
    """Payload recebido pelo endpoint POST /api/query."""
    pergunta: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Pergunta do usuário em linguagem natural.",
        examples=["Qual produto vendeu mais em 2025?"],
    )


class QueryResponse(BaseModel):
    """Payload retornado pelo endpoint POST /api/query."""
    sql: str = Field(description="Query SQL gerada e validada pelo sistema.")
    sintese: str = Field(description="Síntese textual amigável gerada pelo Gemini.")
    columns: list[str] = Field(description="Nomes das colunas retornadas pela query.")
    rows: list[list] = Field(description="Linhas de dados retornadas pela query.")
    total_registros: int = Field(description="Quantidade de linhas retornadas.")


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get(
    "/api/health",
    summary="Health Check",
    tags=["Utilitários"],
)
async def health_check():
    """
    Verifica se a API está operacional e se o banco de dados está acessível.
    Útil para monitoramento e validação do ambiente antes do uso.
    """
    ddl_ok = bool(_ddl_cache)
    return {
        "status": "ok",
        "banco_carregado": ddl_ok,
        "ddl_preview": _ddl_cache[:120] + "..." if ddl_ok else "DDL não disponível",
    }


@app.post(
    "/api/query",
    response_model=QueryResponse,
    summary="Text-to-SQL: Converte pergunta em dados",
    tags=["Consultas"],
)
async def query_endpoint(payload: QueryRequest):
    """
    Fluxo principal da aplicação:

    1. Recebe a pergunta do usuário em linguagem natural.
    2. Envia ao Gemini com o DDL do banco como contexto (system_instruction).
    3. Gemini retorna: SQL gerado + síntese textual.
    4. O SQL é validado pela camada de segurança (apenas SELECT ou WITH (CTE) permitidos).
    5. O SQL validado é executado no SQLite.
    6. Retorna colunas, linhas, SQL e síntese ao frontend.

    Erros possíveis:
    - 400: Pergunta inválida ou resposta malformada do Gemini.
    - 403: SQL gerado contém comandos de mutação (bloqueado por segurança).
    - 500: Falha na comunicação com o Google Gemini ou no banco de dados.
    """
    # ── Etapa 1: Chamar o Gemini (Text-to-SQL) ────────────────────────────────
    resultado_gemini = processar_pergunta(
        pergunta=payload.pergunta,
        ddl=_ddl_cache,
    )

    sql_validado = resultado_gemini["sql"]
    sintese = resultado_gemini["sintese"]

    # ── Etapa 2: Executar a query no SQLite ───────────────────────────────────
    try:
        resultado_db = executar_query(sql_validado)
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao executar a query no banco de dados: {str(exc)}",
        ) from exc

    columns = resultado_db["columns"]
    rows = resultado_db["rows"]

    return QueryResponse(
        sql=sql_validado,
        sintese=sintese,
        columns=columns,
        rows=rows,
        total_registros=len(rows),
    )
