# ============================================================
# test_backend.py — Testes do Backend (Text-to-SQL)
# ============================================================
import unittest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from main import app
from gemini_service import validar_sql


class TestBackendSecurity(unittest.TestCase):
    """Testes unitários para a trava de segurança (SQL Guard)."""

    def test_validar_sql_select_valido(self):
        sql = "SELECT produto, SUM(valor_total) FROM vendas GROUP BY produto;"
        resultado = validar_sql(sql)
        self.assertEqual(resultado, sql)

    def test_validar_sql_com_espacos_e_quebra(self):
        sql = "\n  SELECT * FROM vendas WHERE status = 'CONCLUIDA'\n"
        resultado = validar_sql(sql)
        self.assertEqual(resultado, sql)

    def test_validar_sql_drop_table_bloqueado(self):
        sql = "DROP TABLE vendas;"
        with self.assertRaises(HTTPException) as ctx:
            validar_sql(sql)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_validar_sql_insert_bloqueado(self):
        sql = "INSERT INTO vendas VALUES (1, 2, '2025-01-01', 10, 100.0, 'SP');"
        with self.assertRaises(HTTPException) as ctx:
            validar_sql(sql)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_validar_sql_update_bloqueado(self):
        sql = "UPDATE vendas SET valor_total = 0;"
        with self.assertRaises(HTTPException) as ctx:
            validar_sql(sql)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_validar_sql_delete_bloqueado(self):
        sql = "DELETE FROM vendas;"
        with self.assertRaises(HTTPException) as ctx:
            validar_sql(sql)
        self.assertEqual(ctx.exception.status_code, 403)


class TestBackendEndpoints(unittest.TestCase):
    """Testes de integração para os endpoints da API."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Força a execução das funções de lifespan do FastAPI
        with cls.client:
            pass

    def test_health_check(self):
        with TestClient(app) as client:
            response = client.get("/api/health")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "ok")
            self.assertTrue(data["banco_carregado"])

    def test_query_endpoint_valido(self):
        with TestClient(app) as client:
            payload = {"pergunta": "Quais são os 5 produtos mais vendidos em quantidade?"}
            response = client.post("/api/query", json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()

            # Valida estrutura da resposta
            self.assertIn("sql", data)
            self.assertIn("sintese", data)
            self.assertIn("columns", data)
            self.assertIn("rows", data)
            self.assertIn("total_registros", data)

            # Valida que o SQL é um SELECT
            self.assertTrue(data["sql"].strip().upper().startswith("SELECT"))
            self.assertGreaterEqual(data["total_registros"], 0)
            print(f"\n[TEST SUCCEEDED] Query: {payload['pergunta']}")
            print(f"[SQL Gerado]: {data['sql']}")
            print(f"[Síntese]: {data['sintese']}")
            print(f"[Total Registros]: {data['total_registros']}")


if __name__ == "__main__":
    unittest.main()
