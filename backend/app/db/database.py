import sqlite3
import random
import os
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = os.getenv("DB_PATH") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "vendas_ficticias.db",
)


def gerar_dados() -> None:
    """
    Cria e popula a tabela 'vendas' com 150 registros fictícios de produtos de tecnologia.
    Idempotente: retorna imediatamente se a tabela já contém dados.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vendas (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            data            TEXT,
            produto         TEXT,
            valor_unidade   REAL,
            quantidade      INTEGER,
            total           REAL,
            forma_pagamento TEXT,
            parcelado       TEXT
        )
    """)

    cursor.execute("SELECT COUNT(*) FROM vendas")
    if cursor.fetchone()[0] > 0:
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
        data_venda = (data_inicial + timedelta(days=random.randint(0, 410))).strftime("%Y-%m-%d")
        prod_nome, prod_preco = random.choice(produtos)
        qtd = random.randint(1, 5)
        pagamento = random.choice(formas_pagamento)
        is_parcelado = "Sim" if pagamento == "Cartão de Crédito" and random.random() > 0.3 else "Não"

        cursor.execute("""
            INSERT INTO vendas (data, produto, valor_unidade, quantidade, total, forma_pagamento, parcelado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data_venda, prod_nome, prod_preco, qtd, round(prod_preco * qtd, 2), pagamento, is_parcelado))

    conn.commit()
    conn.close()
    print(f"[database] Banco '{DB_PATH}' gerado com 150 registros.")


def get_ddl() -> str:
    """
    Extrai o DDL de todas as tabelas via sqlite_master.
    O resultado é injetado como system_instruction no Gemini para contextualizar o schema.
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
    return "\n\n".join(row[0] for row in rows)


def _conectar_somente_leitura() -> sqlite3.Connection:
    """Abre o SQLite em modo somente leitura (`mode=ro`): defesa real, no nível do driver."""
    uri = Path(DB_PATH).resolve().as_uri() + "?mode=ro"
    return sqlite3.connect(uri, uri=True)


def executar_query(sql: str) -> dict:
    """
    Executa um SELECT no banco e retorna colunas e linhas em formato serializável.
    SQL vazio retorna resultado vazio sem abrir conexão.

    A conexão é somente leitura e o driver do Python rejeita múltiplos statements,
    complementando o SQL Guard baseado em regex (defesa em profundidade).
    """
    if not sql or not sql.strip():
        return {"columns": [], "rows": []}

    conn = _conectar_somente_leitura()
    try:
        cursor = conn.execute(sql)
        columns = [description[0] for description in cursor.description]
        rows = [list(row) for row in cursor.fetchall()]
    finally:
        conn.close()

    return {"columns": columns, "rows": rows}
