-- ============================================================================
-- Lançamentos de SETEMBRO/2026 — Convênio 001/FMAS/2025 (6ª parcela)
-- ============================================================================
-- ⚠️ ATENÇÃO — VALORES PROJETADOS, NÃO APURADOS
--
-- Este script foi montado a partir dos tetos do Plano de Trabalho e do padrão
-- de agosto/2026, SEM o extrato bancário de setembro. Antes de protocolar,
-- confira contra o extrato:
--
--   1. O repasse entrou em 03/09? No valor de R$ 12.950,37?
--   2. Houve rendimento de aplicação? (em agosto foi 0,00 — aqui assumido 0,00)
--   3. O valor exato dos encargos recolhidos (aqui: 29% da folha custeada)
--   4. A data real de cada pagamento — a prestação é por REGIME DE CAIXA.
--      Pagamento que saiu em 01/10 pertence a outubro, não a setembro.
--
-- Se algum valor divergir, corrija a linha correspondente ANTES de rodar.
-- ============================================================================
--
-- REGRA DO TETO DA RUBRICA
--   Os salários efetivos estão ACIMA do previsto no Plano de Trabalho. O
--   convênio custeia até o limite da rubrica; o excedente é suportado pela OSC
--   com recursos próprios e NÃO transita nesta prestação:
--     Ana Célia  — real 2.678,80 | rubrica 2.527,17 | excedente OSC   151,63
--     Sulene     — real 1.907,43 | rubrica 1.697,60 | excedente OSC   209,83
--     Luzenilda  — real 2.678,80 | rubrica 2.527,17 | excedente OSC   151,63
--                                          excedente total mensal     513,09
--
-- LUZENILDA — mês integral
--   Retornou das férias em 31/08/2026 e trabalhou setembro completo, logo a
--   rubrica volta ao valor cheio (em agosto foram R$ 81,52, de 1 dia).
--
-- ENCARGOS (1.2): limitado ao teto MENSAL da rubrica
--     Rubrica anual R$ 23.496,84 / 12 = R$ 1.958,07
--     O encargo efetivo sobre a folha real da OSC (R$ 7.265,03) seria maior;
--     o convênio custeia apenas o que a rubrica disponibiliza.
--
-- PROVISIONAMENTO (1.3): R$ 0,00 — sem pagamento de férias/13º/rescisão no mês
--
-- VALE TRANSPORTE (1.4): R$ 0,00 — ÚNICA rubrica sem execução; benefício
--   dispensado formalmente pela colaboradora (art. 5º do Decreto 95.247/87).
--
-- RESUMO ESPERADO
--   Receitas:  25.902,62 (saldo ago) + 12.950,37 (repasse) = 38.852,99
--   Despesas:   6.751,94 + 1.958,07 + 1.617,70            = 10.327,71
--   Saldo p/ outubro                                       = 28.525,28
-- ============================================================================

-- Diagnóstico: confirma que ainda não há lançamentos de setembro (evita duplicar)
SELECT COUNT(*) AS ja_existem
FROM caritas_lancamentos
WHERE convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND data_lancamento BETWEEN '2026-09-01' AND '2026-09-30';

-- ----------------------------------------------------------------------------
-- 1) Repasse municipal — 6ª parcela
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, tipo, data_lancamento, data_pagamento, descricao, valor, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  'repasse', '2026-09-03', '2026-09-03',
  'Repasse Municipal FMAS — Setembro/2026 (6ª parcela)', 12950.37, 'ted', 'corrente', 'realizado'
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
  'despesa', '2026-09-25', '2026-09-25',
  'Salário — Ana Célia Chagas Thomaz (Assistente Social) set/2026', 2527.17,
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
  'despesa', '2026-09-25', '2026-09-25',
  'Salário — Sulene Cavalcante da Silva (Cozinheira) set/2026', 1697.60,
  'Sulene Cavalcante da Silva', '092.910.067-00', 'folha', 'pix', 'corrente', 'realizado',
  'Valor limitado ao teto da rubrica no Plano de Trabalho. Salário efetivo de R$ 1.907,43; diferença de R$ 209,83 custeada pela OSC com recursos próprios.'
);

-- ----------------------------------------------------------------------------
-- 4) Salário — Luzenilda (Psicóloga) · rubrica 1.1 · mês integral
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-09-25', '2026-09-25',
  'Salário — Luzenilda Maria dos Santos (Psicóloga) set/2026', 2527.17,
  'Luzenilda Maria dos Santos', '684.235.787-04', 'folha', 'pix', 'corrente', 'realizado',
  'Mês integral após retorno das férias em 31/08/2026. Valor limitado ao teto da rubrica; salário efetivo de R$ 2.678,80, diferença de R$ 151,63 custeada pela OSC.'
);

-- ----------------------------------------------------------------------------
-- 5) Encargos patronais (INSS/FGTS/PIS) · rubrica 1.2
--    29% sobre a folha custeada pelo convênio (6.751,94)
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, documento_tipo, forma_pagamento, conta_origem, status, observacoes)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '1.2'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-09-25', '2026-09-25',
  'Encargos patronais (INSS, FGTS, PIS) — competência set/2026', 1958.07,
  'INSS / FGTS — Receita Federal', 'recibo', 'pix', 'corrente', 'realizado',
  'Valor limitado ao teto mensal da rubrica no Plano de Trabalho (R$ 23.496,84 / 12 = R$ 1.958,07). O encargo efetivo incidente sobre a folha total da OSC é superior; a diferença é suportada com recursos próprios, não onerando o convênio.'
);

-- ----------------------------------------------------------------------------
-- 6) Gêneros alimentícios · rubrica 2.1
-- ----------------------------------------------------------------------------
INSERT INTO caritas_lancamentos
  (convenio_id, categoria_id, tipo, data_lancamento, data_pagamento, descricao, valor,
   fornecedor_nome, fornecedor_documento, documento_tipo, forma_pagamento, conta_origem, status)
VALUES (
  (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025'),
  (SELECT id FROM caritas_categorias_despesa WHERE codigo = '2.1'
     AND convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')),
  'despesa', '2026-09-15', '2026-09-15',
  'Gêneros alimentícios — set/2026', 1617.70,
  'Cereais de Minas da Vila', '27.344.436/0001-54', 'nf', 'pix', 'corrente', 'realizado'
);

-- ============================================================================
-- Prestação de contas de setembro/2026 (6ª parcela)
-- ============================================================================
DELETE FROM caritas_prestacoes_contas
WHERE convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND periodo_inicio = DATE '2026-09-01'
  AND periodo_fim = DATE '2026-09-30';

INSERT INTO caritas_prestacoes_contas (
  convenio_id, tipo, numero_parcela,
  periodo_inicio, periodo_fim, status, observacoes
)
SELECT
  c.id, 'parcial', 6,
  DATE '2026-09-01', DATE '2026-09-30', 'rascunho',
  $NOTAS$1. (1.4) Custo Efetivo de Vale Transporte — ÚNICA rubrica sem execução no período. Não houve pagamento em razão de dispensa formal do benefício pela colaboradora beneficiária, conforme faculdade prevista no art. 5º do Decreto 95.247/87, que regulamenta a Lei 7.418/85. A declaração de dispensa encontra-se arquivada na sede da OSC à disposição da fiscalização. Execução acumulada no exercício: R$ 236,28 de um previsto acumulado de R$ 708,84, restando R$ 472,56 não executados, mantidos em saldo para os meses subsequentes ou para devolução ao final da vigência.

2. (1.1) Salários e Adicionais — Execução integral do teto da rubrica no período, com o retorno da colaboradora Luzenilda Maria dos Santos (CPF 684.235.787-04), psicóloga, ao trabalho em 31/08/2026, após o gozo de férias de 01/08 a 30/08/2026. Os valores lançados observam estritamente os limites por função fixados no Plano de Trabalho aprovado; as diferenças em relação à remuneração efetiva dos empregados, no montante de R$ 513,09 no mês, são suportadas pela OSC com recursos próprios, não onerando o presente convênio.

3. (1.2) Encargos Patronais — Valor limitado ao teto mensal fixado na rubrica do Plano de Trabalho (R$ 23.496,84 no exercício, correspondentes a R$ 1.958,07 mensais). O encargo efetivamente incidente sobre a folha total dos empregados é superior a esse limite; a diferença é suportada pela OSC com recursos próprios, não onerando o presente convênio.

4. (1.3) Provisionamento — Sem execução no período; não houve pagamento de férias, 13º salário ou verbas rescisórias na competência.$NOTAS$
FROM caritas_convenios c
WHERE c.numero = '001/FMAS/2025';

-- ============================================================================
-- Conferência final
-- ============================================================================
SELECT
  l.tipo,
  COALESCE(cat.codigo, '—') AS rubrica,
  l.data_pagamento,
  l.descricao,
  l.valor
FROM caritas_lancamentos l
LEFT JOIN caritas_categorias_despesa cat ON cat.id = l.categoria_id
WHERE l.convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND l.data_lancamento BETWEEN '2026-09-01' AND '2026-09-30'
ORDER BY l.tipo DESC, cat.codigo, l.data_pagamento;

-- Totais: receita 12.950,37 | despesa 10.327,71
SELECT
  SUM(CASE WHEN tipo IN ('repasse','rendimento') THEN valor ELSE 0 END) AS receitas_periodo,
  SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END)                 AS despesas_periodo
FROM caritas_lancamentos
WHERE convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND data_lancamento BETWEEN '2026-09-01' AND '2026-09-30';
