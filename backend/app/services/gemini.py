import re
import os
import json

from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()


def _criar_cliente() -> genai.Client:
    """
    Instancia o cliente Gemini usando GEMINI_API_KEY do ambiente.
    Falha em RuntimeError se a variável não estiver definida.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Variável de ambiente GEMINI_API_KEY não encontrada. "
            "Verifique o arquivo backend/.env"
        )
    return genai.Client(api_key=api_key)


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
    Guard de segurança: inspeciona o SQL gerado pelo Gemini antes da execução.

    Regras aplicadas em ordem:
    - SQL vazio → aceito (Gemini recusou gerar query — caso válido).
    - Presença de qualquer comando de mutação → HTTP 403 imediato.
    - Query que não inicia com SELECT ou WITH → HTTP 403.
    """
    if not sql or not sql.strip():
        return ""

    # Busca em toda a string para capturar mutação embutida dentro de um SELECT (ex: SELECT ... DELETE ...).
    if _COMANDOS_PROIBIDOS.search(sql):
        raise HTTPException(
            status_code=403,
            detail=(
                f"Operação bloqueada por política de segurança. "
                f"A query contém comandos de mutação proibidos (DROP, INSERT, UPDATE, DELETE, etc.). "
                f"SQL rejeitado: {sql[:120]}"
            ),
        )

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


def _montar_system_instruction(ddl: str) -> str:
    """Constrói o system_instruction com o DDL do banco injetado como contexto."""
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


def _chamar_gemini(pergunta: str, ddl: str) -> dict:
    """Chama o Gemini e devolve o JSON já decodificado (`sql` e `sintese`), ainda sem validação."""
    cliente = _criar_cliente()

    try:
        resposta = cliente.models.generate_content(
            model="gemini-3-flash-preview",
            contents=pergunta,
            config=types.GenerateContentConfig(
                system_instruction=_montar_system_instruction(ddl),
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erro na comunicação com o Google Gemini: {str(exc)}"
        ) from exc

    try:
        return json.loads(resposta.text.strip())
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"O Gemini retornou uma resposta em formato inválido (não é JSON). "
                f"Resposta recebida: {resposta.text.strip()[:300]}"
            ),
        ) from exc


def processar_pergunta(pergunta: str, ddl: str) -> dict:
    """Orquestra o fluxo Text-to-SQL: Gemini → parse JSON → validação de segurança."""

    # Atalho de demonstração: dispara o guard antes de chamar o Gemini quando a própria
    # pergunta do usuário contém palavras-chave de mutação (botão de teste ou input malicioso).
    if any(kw in pergunta.upper() for kw in ["DELETE", "DROP TABLE", "UPDATE VENDAS", "TRUNCATE"]):
        sql_tentativa = (
            pergunta
            if pergunta.upper().startswith(("DELETE", "DROP", "UPDATE", "INSERT"))
            else "DELETE FROM vendas WHERE 1=1"
        )
        validar_sql(sql_tentativa)

    dados = _chamar_gemini(pergunta, ddl)

    return {
        "sql": validar_sql(dados.get("sql", "").strip()),
        "sintese": dados.get("sintese", "Sem síntese disponível."),
    }
