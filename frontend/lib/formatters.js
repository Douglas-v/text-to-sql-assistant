/**
 * Utilitários de formatação para exibição em tabelas, cabeçalhos e gráficos.
 * Centraliza aqui toda a lógica de apresentação para que componentes permaneçam livres de regras de formato.
 */

/**
 * Dicionário de tradução snake_case → PT-BR para colunas conhecidas do banco.
 * Prioridade 1 no formatColumnHeader; expanda conforme o schema evoluir.
 */
export const COLUMN_LABELS = {
  id: 'ID',
  data: 'Data',
  mes: 'Mês',
  ano: 'Ano',
  data_venda: 'Data da Venda',
  mes_ano: 'Mês/Ano',
  produto: 'Produto',
  nome_produto: 'Nome do Produto',
  categoria: 'Categoria',
  valor: 'Valor',
  valor_unidade: 'Valor Unitário',
  valor_total: 'Valor Total',
  total: 'Total',
  faturamento: 'Faturamento',
  receita: 'Receita',
  preco: 'Preço',
  price: 'Preço',
  quantidade: 'Quantidade',
  qtd: 'Qtd.',
  quantidade_vendida: 'Qtd. Vendida',
  itens: 'Itens',
  count: 'Contagem',
  forma_pagamento: 'Forma de Pagamento',
  pagamento: 'Pagamento',
  parcelado: 'Parcelado',
  media: 'Média',
  minimo: 'Mínimo',
  maximo: 'Máximo',
  diferenca: 'Diferença',
  variacao: 'Variação',
  percentual: 'Percentual (%)',
  ticket_medio: 'Ticket Médio',
};

/** @param {string} val @returns {boolean} */
function isISODate(val) {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}(T[\d:.Z+\-]*)?$/.test(val.trim());
}

/** @param {string} val @returns {boolean} */
function isYearMonth(val) {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}$/.test(val.trim());
}

const MONTH_NAMES_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/**
 * Formata YYYY-MM → "jan/25" (abreviação PT-BR).
 * Usa slice em vez de Date para evitar deslocamento de fuso.
 * @param {string} val
 * @returns {string}
 */
export function formatYearMonth(val) {
  if (!isYearMonth(val)) return String(val);
  try {
    const [year, month] = val.trim().split('-');
    const monthName = MONTH_NAMES_SHORT[parseInt(month, 10) - 1] ?? month;
    return `${monthName}/${year.slice(2)}`;
  } catch {
    return val;
  }
}

/**
 * Formata YYYY-MM-DD → DD/MM/AAAA (PT-BR).
 * Usa slice(0,10) para ignorar a parte de horário e evitar deslocamento de fuso.
 * @param {string} val
 * @returns {string}
 */
export function formatDate(val) {
  if (!isISODate(val)) return val;
  try {
    const [year, month, day] = val.trim().slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return val;
  }
}

/**
 * Rótulo amigável para cabeçalhos de tabela.
 * Ordem de prioridade: COLUMN_LABELS → fallback snake_case → Title Case.
 * @param {string} colName
 * @returns {string}
 */
export function formatColumnHeader(colName) {
  if (!colName) return '';
  const lower = colName.toLowerCase().trim();
  if (COLUMN_LABELS[lower]) return COLUMN_LABELS[lower];
  return lower
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formata o valor de uma célula de tabela.
 * - YYYY-MM → jan/25 (ano-mês tem prioridade para não ser tratado como data incompleta)
 * - ISO date → DD/MM/AAAA
 * - Número em coluna de moeda (por heurística de nome) → BRL
 * - Outros números → locale pt-BR
 * - null/undefined → traço (-)
 * @param {*} val
 * @param {string} colName
 * @returns {string}
 */
export function formatTableCell(val, colName) {
  if (val === null || val === undefined) return '-';

  if (typeof val === 'string') {
    if (isYearMonth(val)) return formatYearMonth(val);
    if (isISODate(val)) return formatDate(val);
    return val;
  }

  if (typeof val === 'number') {
    const colLower = (colName ?? '').toLowerCase();

    const isQuantity =
      colLower.includes('quantidade') ||
      colLower.includes('qtd') ||
      colLower.includes('unidade') ||
      colLower.includes('count') ||
      colLower.includes('itens');

    // Exclui colunas de quantidade para não formatar contagens como moeda
    const isCurrency =
      !isQuantity &&
      (colLower.includes('valor') ||
        colLower.includes('preco') ||
        colLower.includes('price') ||
        colLower.includes('faturamento') ||
        colLower.includes('receita') ||
        colLower === 'total');

    if (isCurrency) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }

    return val.toLocaleString('pt-BR');
  }

  return String(val);
}
