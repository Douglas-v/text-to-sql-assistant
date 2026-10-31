import os
import sqlite3
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.db.database import gerar_dados, get_ddl, executar_query
from app.services.gemini import processar_pergunta


# DDL carregado uma única vez no startup para evitar leituras repetidas ao SQLite por requisição.
_ddl_cache: str = ""

# Origens permitidas (separadas por vírgula). Default: frontend local do Next.js.
_CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: garante que o banco existe (gerar_dados é idempotente) e preenche _ddl_cache.
    Shutdown: ponto de extensão para liberar recursos assíncronos.
    """
    global _ddl_cache

    print("[startup] Inicializando banco de dados...")
    gerar_dados()

    print("[startup] Carregando DDL do banco para cache...")
    _ddl_cache = get_ddl()
    print(f"[startup] DDL carregado ({len(_ddl_cache)} caracteres).")

    yield

    print("[shutdown] Encerrando aplicação.")


app = FastAPI(
    title="Text-to-SQL API — Data Intelligence Assistant",
    description=(
        "API que converte perguntas em linguagem natural em consultas SQL "
        "usando o Google Gemini, executando-as com segurança em um banco SQLite."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/api/health", summary="Health Check", tags=["Utilitários"])
async def health_check():
    """Verifica se a API está operacional e se o DDL foi carregado no startup."""
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
    Fluxo principal:
    1. Envia a pergunta ao Gemini com o DDL como contexto.
    2. Gemini retorna SQL + síntese textual.
    3. SQL é validado pelo guard (somente SELECT/WITH permitidos) — HTTP 403 se bloqueado.
    4. SQL validado é executado no SQLite.

    Códigos de erro: 400 (resposta malformada), 403 (mutação bloqueada), 500 (falha Gemini/DB).
    """
    resultado_gemini = processar_pergunta(
        pergunta=payload.pergunta,
        ddl=_ddl_cache,
    )

    sql_validado = resultado_gemini["sql"]
    sintese = resultado_gemini["sintese"]

    try:
        resultado_db = executar_query(sql_validado)
    except (sqlite3.Error, sqlite3.Warning) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao executar a query no banco de dados: {str(exc)}",
        ) from exc

    return QueryResponse(
        sql=sql_validado,
        sintese=sintese,
        columns=resultado_db["columns"],
        rows=resultado_db["rows"],
        total_registros=len(resultado_db["rows"]),
    )
