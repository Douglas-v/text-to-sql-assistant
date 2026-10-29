"""Testes do backend: SQL Guard (unitários) e endpoints (integração com Gemini mockado)."""
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.db import database
from app.main import app
from app.services import gemini
from app.services.gemini import validar_sql


# --------------------------------------------------------------------------- #
# SQL Guard
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "sql",
    [
        "SELECT produto, SUM(total) FROM vendas GROUP BY produto;",
        "\n  SELECT * FROM vendas WHERE forma_pagamento = 'Pix'\n",
        "WITH t AS (SELECT * FROM vendas) SELECT COUNT(*) FROM t",
    ],
)
def test_guard_permite_consultas_de_leitura(sql):
    assert validar_sql(sql) == sql


def test_guard_aceita_sql_vazio():
    assert validar_sql("") == ""


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE vendas;",
        "INSERT INTO vendas VALUES (1, '2025-01-01', 'X', 1, 1, 1, 'Pix', 'Não');",
        "UPDATE vendas SET total = 0;",
        "DELETE FROM vendas;",
        "SELECT 1; DROP TABLE vendas",
        "PRAGMA table_info(vendas)",
        "EXPLAIN SELECT 1",
    ],
)
def test_guard_bloqueia_mutacoes_com_403(sql):
    with pytest.raises(HTTPException) as exc:
        validar_sql(sql)
    assert exc.value.status_code == 403


# --------------------------------------------------------------------------- #
# Camada de banco
# --------------------------------------------------------------------------- #
@pytest.fixture()
def banco_temporario(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", str(tmp_path / "teste.db"))
    database.gerar_dados()
    return database.DB_PATH


def test_gerar_dados_e_idempotente(banco_temporario):
    database.gerar_dados()
    resultado = database.executar_query("SELECT COUNT(*) AS n FROM vendas")
    assert resultado["rows"][0][0] == 150


def test_executar_query_retorna_colunas_e_linhas(banco_temporario):
    resultado = database.executar_query("SELECT produto, total FROM vendas LIMIT 3")
    assert resultado["columns"] == ["produto", "total"]
    assert len(resultado["rows"]) == 3


# --------------------------------------------------------------------------- #
# Endpoints (Gemini mockado: sem rede e sem chave de API)
# --------------------------------------------------------------------------- #
@pytest.fixture()
def client(banco_temporario):
    with TestClient(app) as c:
        yield c


def _mock_gemini(monkeypatch, sql, sintese="Resultado de teste."):
    monkeypatch.setattr(
        gemini,
        "_chamar_gemini",
        lambda pergunta, ddl: {"sql": sql, "sintese": sintese},
    )


def test_health_check(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["banco_carregado"] is True


def test_query_valida_retorna_dados(client, monkeypatch):
    _mock_gemini(
        monkeypatch,
        "SELECT produto, SUM(quantidade) AS qtd FROM vendas GROUP BY produto ORDER BY qtd DESC LIMIT 3",
    )
    resp = client.post("/api/query", json={"pergunta": "Quais os 3 produtos mais vendidos?"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["columns"] == ["produto", "qtd"]
    assert body["total_registros"] == 3


def test_query_com_mutacao_gerada_pelo_llm_retorna_403(client, monkeypatch):
    _mock_gemini(monkeypatch, "DELETE FROM vendas")
    resp = client.post("/api/query", json={"pergunta": "Apague tudo por favor"})
    assert resp.status_code == 403


def test_pergunta_curta_demais_retorna_422(client):
    assert client.post("/api/query", json={"pergunta": "oi"}).status_code == 422
