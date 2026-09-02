-- ============================================================================
-- Lançamentos de AGOSTO/2026 — Convênio 001/FMAS/2025 (5ª parcela do exercício)
-- Base: RECIBO FOLHA CONVENIO 08-2026.pdf (competência 01/08 a 31/08/2026)
-- ============================================================================
-- REGRA DO TETO DA RUBRICA
--   Os salários efetivos estão ACIMA do previsto no Plano de Trabalho. O
--   convênio custeia até o limite da rubrica; o excedente é suportado pela OSC
--   com recursos próprios e NÃO transita nesta prestação:
--     Ana Célia  — real 2.678,80 | rubrica 2.527,17 | excedente OSC   151,63
--     Sulene     — real 1.907,43 | rubrica 1.697,60 | excedente OSC   209,83
--     Luzenilda  — real    86,41 | rubrica    81,52 | excedente OSC     4,89
--
-- FÉRIAS DA LUZENILDA
--   Gozo de 01/08 a 30/08/2026 (30 dias), remuneração antecipada e paga em
--   julho/2026 (art. 145 CLT). Retornou em 31/08 e trabalhou 1 dia:
--     Rubrica proporcional = R$ 2.527,17 / 31 dias x 1 dia = R$ 81,52
--
-- ENCARGOS (1.2): 29% sobre a folha custeada pelo convênio
--     R$ 4.306,29 x 29% = R$ 1.248,82
--
-- PROVISIONAMENTO (1.3): R$ 0,00 — sem pagamento de férias/13º/rescisão no mês
--   (a liquidação das férias ocorreu em julho/2026).
--
-- VALE TRANSPORTE (1.4): R$ 0,00 — ÚNICA rubrica sem execução; benefício
--   dispensado formalmente pela colaboradora.
--
-- ⚠️ AJUSTE as datas de pagamento e o valor dos gêneros conforme extrato/NF.
-- ============================================================================

-- Diagnóstico: confirma que ainda não há lançamentos de agosto (evita duplicar)
SELECT COUNT(*) AS ja_existem
FROM caritas_lancamentos
WHERE convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND data_lancamento BETWEEN '2026-08-01' AND '2026-08-31';

-- ----------------------------------------------------------------------------
-- 1) Repasse municipal — 5ª parcela
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, tipo, data_lancamento, data_pagamento, descricao, valor, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  'repasse', '2026-08-03', '2026-08-03',
  'Repasse Municipal FMAS — Agosto/2026 (5ª parcela)', 12950.37, 'ted', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- 2) Salário — Ana Célia (Assistente Social) · rubrica 1.1 · teto da rubrica
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-08-25', '2026-08-25',
  'Salário — Ana Célia Chagas Thomaz (Assistente Social) ago/2026', 2527.17,
  'Ana Célia Chagas Thomaz', '104.905.617-56', 'folha', 'pix', 'corrente', 'realizado',
  'Valor limitado ao teto da rubrica no Plano de Trabalho. Salário efetivo de R$ 2.678,80; diferença de R$ 151,63 custeada pela OSC com recursos próprios.'
);

-- ----------------------------------------------------------------------------
-- 3) Salário — Sulene (Cozinheira) · rubrica 1.1 · teto da rubrica
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-08-25', '2026-08-25',
  'Salário — Sulene Cavalcante da Silva (Cozinheira) ago/2026', 1697.60,
  'Sulene Cavalcante da Silva', '092.910.067-00', 'folha', 'pix', 'corrente', 'realizado',
  'Valor limitado ao teto da rubrica no Plano de Trabalho. Salário efetivo de R$ 1.907,43; diferença de R$ 209,83 custeada pela OSC com recursos próprios.'
);

-- ----------------------------------------------------------------------------
-- 4) Salário — Luzenilda (Psicóloga) · rubrica 1.1 · PROPORCIONAL a 1 dia
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-08-25', '2026-08-25',
  'Salário — Luzenilda Maria dos Santos (Psicóloga) ago/2026 — 1 dia trabalhado (31/08)', 81.52,
  'Luzenilda Maria dos Santos', '684.235.787-04', 'folha', 'pix', 'corrente', 'realizado',
  'Em gozo de férias de 01/08 a 30/08/2026 (30 dias), remuneração paga em julho/2026. Retorno em 31/08: rubrica proporcional de R$ 2.527,17 / 31 x 1 = R$ 81,52. Salário efetivo do dia: R$ 86,41; diferença de R$ 4,89 custeada pela OSC.'
);

-- ----------------------------------------------------------------------------
-- 5) Encargos patronais · rubrica 1.2 · 29% sobre a folha custeada (4.306,29)
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.2'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-08-25', '2026-08-25',
  'Encargos patronais sobre a folha (INSS + FGTS + PIS) ago/2026', 1248.82,
  'INSS / FGTS — Receita Federal', 'recibo', 'pix', 'corrente', 'realizado',
  'Incidência de 29% sobre a folha custeada pelo convênio no mês (R$ 4.306,29), reduzida pelo gozo de férias da colaboradora Luzenilda Maria dos Santos.'
);

-- ----------------------------------------------------------------------------
-- 6) Gêneros alimentícios · rubrica 2.1  (ajuste pelo valor da NF)
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '2.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-08-15', '2026-08-15',
  'Gêneros alimentícios — agosto/2026', 1617.70,
  'Cereais de Minas da Vila', '27.344.436/0001-54', 'nf', 'pix', 'corrente', 'realizado'
);

-- ----------------------------------------------------------------------------
-- 7) OPCIONAL — Rendimento da aplicação (preencha pelo extrato)
-- ----------------------------------------------------------------------------
-- INSERT INTO caritas_lancamentos
--   (convenio_id, tipo, data_lancamento, data_pagamento, descricao, valor, conta_origem, status)
-- VALUES (
--   (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
--   'rendimento', '2026-08-31', '2026-08-31',
--   'Rendimento da aplicação financeira — agosto/2026', 0.00, 'aplicacao', 'realizado'
-- );

-- ----------------------------------------------------------------------------
-- Conferência: movimento de agosto
-- ----------------------------------------------------------------------------
SELECT
  l.data_lancamento,
  l.tipo,
  COALESCE((SELECT codigo FROM caritas_categorias_despesa WHERE id = l.categoria_id), '—') AS rubrica,
  l.descricao,
  l.valor
FROM caritas_lancamentos l
WHERE l.convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND l.data_lancamento BETWEEN '2026-08-01' AND '2026-08-31'
ORDER BY l.data_lancamento, rubrica;
