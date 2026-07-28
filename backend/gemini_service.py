# ============================================================
# gemini_service.py — Integração com o Google Gemini SDK
# ============================================================
# Responsabilidades:
#   1. Montar o system_instruction com o DDL do banco para contextualizar a IA
#   2. Enviar a pergunta do usuário ao Gemini e obter resposta estruturada
#      (query SQL + síntese em linguagem natural)
#   3. Aplicar a camada de segurança que BLOQUEIA qualquer SQL que não seja SELECT ou CTE (WITH)
# ============================================================

import re
import os
import json

from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import HTTPException

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# ── Inicialização do cliente Gemini ──────────────────────────────────────────

def _criar_cliente() -> genai.Client:
    """
    Instancia o cliente do SDK do Google Gemini usando a chave de API
    armazenada na variável de ambiente GEMINI_API_KEY.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Variável de ambiente GEMINI_API_KEY não encontrada. "
            "Verifique o arquivo backend/.env"
        )
    return genai.Client(api_key=api_key)


# ── Camada de Segurança (SQL Guard) ─────────────────────────────────────────

_COMANDOS_PROIBIDOS = re.compile(
    r"\b(DROP|INSERT|UPDATE|DELETE|ALTER|CREATE|TRUNCATE|REPLACE|MERGE|GRANT|REVOKE|ATTACH|DETACH|PRAGMA)\b",
    flags=re.IGNORECASE,
)

_APENAS_SELECT = re.compile(
    r"^\s*(SELECT|WITH)\b",
    flags=re.IGNORECASE,
)


def validar_sql(sql: str) -> str:
    """
    Camada de segurança crítica: inspeciona o SQL gerado antes da execução no banco de dados.

    Regras:
      - Se a IA não gerou SQL (recusa válida), retorna string vazia.
      - Se houver SQL gerado, deve começar obrigatoriamente com SELECT ou WITH (CTE).
      - Qualquer palavra-chave de mutação (DROP, INSERT, UPDATE, DELETE, ALTER, etc.)
        dispara um bloqueio imediato via HTTP 403.
    """
    if not sql or not sql.strip():
        return ""

    # Verifica presença de comandos de mutação em qualquer parte da query
    if _COMANDOS_PROIBIDOS.search(sql):
        raise HTTPException(
            status_code=403,
            detail=(
                f"Operação bloqueada por política de segurança. "
                f"A query contém comandos de mutação proibidos (DROP, INSERT, UPDATE, DELETE, etc.). "
                f"SQL rejeitado: {sql[:120]}"
            ),
        )

    # Verifica se inicia com SELECT ou WITH
    if not _APENAS_SELECT.match(sql):
        raise HTTPException(
            status_code=403,
            detail=(
                f"Operação bloqueada por política de segurança. "
                f"Apenas consultas SELECT ou CTE (WITH) são permitidas. "
                f"SQL rejeitado: {sql[:120]}"
            ),
        )

    return sql


# ── Prompt Engineering ───────────────────────────────────────────────────────

def _montar_system_instruction(ddl: str) -> str:
    """
    Constrói o system_instruction enviado ao Gemini a cada requisição.
    """
    return f"""Você é um especialista em análise de dados e SQL otimizado para SQLite.

Você tem acesso a um banco de dados SQLite com a seguinte estrutura:

--- DDL DO BANCO DE DADOS ---
{ddl}
-----------------------------

REGRAS OBRIGATÓRIAS:
1. Gere APENAS consultas SELECT ou CTE (WITH). NUNCA gere DROP, INSERT, UPDATE, DELETE, ALTER ou qualquer outro comando de mutação.
2. Use nomes de colunas e tabelas EXATAMENTE como definidos no DDL acima.
3. O campo 'data' está no formato TEXT 'YYYY-MM-DD'. Use funções SQLite como strftime() para manipulação de datas.
4. Para perguntas sobre produtos/itens únicos ou extremos (ex: "produto mais caro", "menor e maior valor"), use DISTINCT, GROUP BY ou subqueries apropriadas com LIMIT para evitar retornar linhas duplicadas desnecessárias da tabela de transações.
5. Se utilizar UNION ou UNION ALL em SQLite com ORDER BY ou LIMIT, garanta a sintaxe válida encerrando subqueries individuais entre parênteses: ex `(SELECT ... LIMIT 1) UNION ALL (SELECT ... LIMIT 1)` ou coloque um único ORDER BY no final.
6. Sempre retorne um JSON VÁLIDO, sem nenhum texto fora do JSON, sem markdown, sem blocos de código.

FORMATO OBRIGATÓRIO DA RESPOSTA (JSON puro):
{{
  "sql": "SELECT ... FROM vendas ...",
  "sintese": "Texto amigável explicando o resultado da consulta em português, em 2-3 frases."
}}

Se a pergunta pedir para deletar/alterar dados ou se não for possível responder com os dados disponíveis, retorne a explicação na 'sintese' e coloque string vazia em 'sql'.
"""


# ── Função Principal ─────────────────────────────────────────────────────────

def processar_pergunta(pergunta: str, ddl: str) -> dict:
    """
    Orquestra o fluxo completo Text-to-SQL.
    """
    # Atalho para teste explícito de mutação enviado pelo botão de segurança ou usuário
    if any(kw in pergunta.upper() for kw in ["DELETE", "DROP TABLE", "UPDATE VENDAS", "TRUNCATE"]):
        sql_tentativa = pergunta if pergunta.upper().startswith(("DELETE", "DROP", "UPDATE", "INSERT")) else f"DELETE FROM vendas WHERE 1=1"
        validar_sql(sql_tentativa)

    cliente = _criar_cliente()
    system_instruction = _montar_system_instruction(ddl)

    try:
        resposta = cliente.models.generate_content(
            model="gemini-3-flash-preview",
            contents=pergunta,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro na comunicação com o Google Gemini: {str(exc)}"
        ) from exc

    # ── Parse da resposta JSON ────────────────────────────────────────────────
    texto_resposta = resposta.text.strip()

    try:
        dados = json.loads(texto_resposta)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"O Gemini retornou uma resposta em formato inválido (não é JSON). "
                f"Resposta recebida: {texto_resposta[:300]}"
            ),
        ) from exc

    sql_gerado = dados.get("sql", "").strip()
    sintese = dados.get("sintese", "Sem síntese disponível.")

    # ── Validação de Segurança ────────────────────────────────────────────────
    sql_validado = validar_sql(sql_gerado)

    return {
        "sql": sql_validado,
        "sintese": sintese,
    }
