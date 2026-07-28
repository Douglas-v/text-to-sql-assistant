# ============================================================
# database.py — Geração do banco, leitura do DDL e execução de queries
# ============================================================
# Responsabilidades:
#   1. Gerar o banco de dados SQLite com dados fictícios (se não existir)
#   2. Extrair o DDL (estrutura das tabelas) para ser injetado no Gemini
#   3. Executar queries SELECT de forma segura, retornando colunas + linhas
# ============================================================

import sqlite3
import random
import os
from datetime import datetime, timedelta

# Caminho do banco relativo à pasta backend/
DB_PATH = os.path.join(os.path.dirname(__file__), "vendas_ficticias.db")


def gerar_dados() -> None:
    """
    Cria o banco de dados SQLite e popula a tabela 'vendas' com 150 registros
    fictícios de produtos de tecnologia. Executado apenas se o arquivo .db
    ainda não existir, evitando duplicação de dados em reinicializações.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Criação da tabela
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendas (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            data            TEXT,           -- Formato: YYYY-MM-DD
            produto         TEXT,
            valor_unidade   REAL,
            quantidade      INTEGER,
            total           REAL,
            forma_pagamento TEXT,
            parcelado       TEXT            -- 'Sim' ou 'Não'
        )
    """)

    # Verifica se já existem dados para não duplicar em múltiplas execuções
    cursor.execute("SELECT COUNT(*) FROM vendas")
    count = cursor.fetchone()[0]
    if count > 0:
        conn.close()
        return

    produtos = [
        ("Notebook Gamer", 4500.00),
        ("Mouse Sem Fio", 120.00),
        ("Teclado Mecânico", 350.00),
        ("Monitor 4K", 2100.00),
        ("Headset 7.1", 280.00),
        ("Cadeira Ergonômica", 1200.00),
        ("Webcam Full HD", 320.00),
        ("SSD 1TB", 450.00),
    ]

    formas_pagamento = ["Pix", "Cartão de Crédito", "Boleto", "Cartão de Débito"]

    data_inicial = datetime(2025, 1, 1)

    for _ in range(150):
        dias_aleatorios = random.randint(0, 410)
        data_venda = (data_inicial + timedelta(days=dias_aleatorios)).strftime("%Y-%m-%d")

        prod_nome, prod_preco = random.choice(produtos)
        qtd = random.randint(1, 5)
        valor_total = round(prod_preco * qtd, 2)

        pagamento = random.choice(formas_pagamento)
        is_parcelado = "Sim" if pagamento == "Cartão de Crédito" and random.random() > 0.3 else "Não"

        cursor.execute("""
            INSERT INTO vendas (data, produto, valor_unidade, quantidade, total, forma_pagamento, parcelado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data_venda, prod_nome, prod_preco, qtd, valor_total, pagamento, is_parcelado))

    conn.commit()
    conn.close()
    print(f"[database] Banco '{DB_PATH}' gerado com 150 registros.")


def get_ddl() -> str:
    """
    Extrai o DDL completo de todas as tabelas do banco de dados SQLite.
    Esse DDL é utilizado como 'system_instruction' no Gemini.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sql FROM sqlite_master
        WHERE type = 'table' AND sql IS NOT NULL
        ORDER BY name
    """)
    rows = cursor.fetchall()
    conn.close()

    ddl_statements = [row[0] for row in rows]
    return "\n\n".join(ddl_statements)


def executar_query(sql: str) -> dict:
    """
    Executa uma query SELECT no banco de dados de forma segura e retorna
    as colunas e linhas resultantes em formato serializable (dict/list).
    """
    if not sql or not sql.strip():
        return {
            "columns": [],
            "rows": [],
        }

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(sql)
    columns = [description[0] for description in cursor.description]
    rows = [list(row) for row in cursor.fetchall()]

    conn.close()

    return {
        "columns": columns,
        "rows": rows,
    }
