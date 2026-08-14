-- ============================================================================
-- Lançamentos de JULHO/2026 — Convênio 001/FMAS/2025 (4ª parcela do exercício)
-- ============================================================================
-- Regra aplicada: regime de CAIXA (só entra o que saiu da conta).
-- A rubrica 1.3 recebe as FÉRIAS REAIS pagas — NÃO se lança o provisionamento
-- mensal por cima (evita dupla contagem: a 1.3 já É a reserva de férias/13º).
-- Vale Transporte (1.4): NÃO lançado — colaboradora dispensou o benefício.
--
-- ⚠️ AJUSTE AS DATAS E VALORES conforme o extrato bancário e a folha real.
-- ============================================================================

-- Diagnóstico: confirma que ainda não há lançamentos de julho (evita duplicar)
SELECT COUNT(*) AS ja_existem
FROM caritas_lancamentos
WHERE convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND data_lancamento BETWEEN '2026-07-01' AND '2026-07-31'
  AND tipo <> 'rendimento';

-- ----------------------------------------------------------------------------
-- 1) Repasse municipal — 4ª parcela
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, tipo, data_lancamento, data_pagamento, descricao, valor, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  'repasse', '2026-07-01', '2026-07-01',
  'Repasse Municipal FMAS — Julho/2026 (4ª parcela)', 12950.37, 'ted', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- 2) Salário — Ana Célia (Assistente Social) · rubrica 1.1
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-07-25', '2026-07-25',
  'Salário — Ana Célia Chagas Thomaz (Assistente Social) jul/2026', 2527.17,
  'Ana Célia Chagas Thomaz', '104.905.617-56', 'folha', 'pix', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- 3) Salário — Luzenilda (Psicóloga) · rubrica 1.1
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-07-25', '2026-07-25',
  'Salário — Luzenilda Maria dos Santos (Psicóloga) jul/2026', 2527.17,
  'Luzenilda Maria dos Santos', '684.235.787-04', 'folha', 'pix', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- 4) Salário — Sulene (Cozinheira) · rubrica 1.1
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-07-25', '2026-07-25',
  'Salário — Sulene Cavalcante da Silva (Cozinheira) jul/2026', 1697.60,
  'Sulene Cavalcante da Silva', '092.910.067-00', 'folha', 'pix', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- 5) Encargos patronais sobre a folha · rubrica 1.2
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, documento_tipo, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.2'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-07-25', '2026-07-25',
  'Encargos patronais sobre a folha (INSS + FGTS + PIS) jul/2026', 1958.07,
  'INSS / FGTS — Receita Federal', 'recibo', 'pix', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- 6) Férias da Luzenilda (salário + 1/3) · rubrica 1.3
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.3'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-07-30', '2026-07-30',
  'Férias — Luzenilda Maria dos Santos (salário + 1/3), gozo em ago/2026', 3369.56,
  'Luzenilda Maria dos Santos', '684.235.787-04', 'folha', 'pix', 'corrente', 'realizado',
  'Pagamento antecipado conforme art. 145 da CLT. Liquidação da provisão acumulada na rubrica 1.3.'
);

-- ----------------------------------------------------------------------------
-- 7) Encargos sobre as férias (INSS 20% + FGTS 8%) · rubrica 1.3
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.3'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-07-30', '2026-07-30',
  'Encargos sobre férias — INSS patronal 20% + FGTS 8% (Luzenilda)', 943.47,
  'INSS / FGTS — Receita Federal', 'recibo', 'pix', 'corrente', 'realizado',
  'INSS R$ 673,91 + FGTS R$ 269,56 sobre base de R$ 3.369,56.'
);

-- ----------------------------------------------------------------------------
-- 8) Gêneros alimentícios · rubrica 2.1
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '2.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-07-15', '2026-07-15',
  'Gêneros alimentícios — julho/2026', 1617.70,
  'Cereais de Minas da Vila', '27.344.436/0001-54', 'nf', 'pix', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- Conferência final: movimento de julho
-- ----------------------------------------------------------------------------
SELECT
  l.data_lancamento,
  l.tipo,
  COALESCE((SELECT codigo FROM caritas_categorias_despesa WHERE id = l.categoria_id), '—') AS rubrica,
  l.descricao,
  l.valor
FROM caritas_lancamentos l
WHERE l.convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND l.data_lancamento BETWEEN '2026-07-01' AND '2026-07-31'
ORDER BY l.data_lancamento, rubrica;
