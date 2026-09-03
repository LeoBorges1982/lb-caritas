-- ============================================================================
-- Prestação de contas de AGOSTO/2026 (5ª parcela) — recriação
-- ============================================================================
-- A prestação foi excluída e precisa voltar. Os lançamentos do período não
-- foram afetados, então os valores são recalculados na abertura.
--
-- Também garante a coluna numero_parcela, que o código insere mas que não
-- consta de nenhuma migração versionada — existe apenas porque foi criada
-- direto no banco. Em qualquer ambiente novo o INSERT falharia sem isto.
-- ============================================================================

ALTER TABLE caritas_prestacoes_contas
  ADD COLUMN IF NOT EXISTS numero_parcela INTEGER;

-- Evita duplicar caso este script rode duas vezes
DELETE FROM caritas_prestacoes_contas
WHERE convenio_id = (SELECT id FROM caritas_convenios WHERE numero = '001/FMAS/2025')
  AND periodo_inicio = DATE '2026-08-01'
  AND periodo_fim = DATE '2026-08-31';

INSERT INTO caritas_prestacoes_contas (
  convenio_id, tipo, numero_parcela,
  periodo_inicio, periodo_fim, status, observacoes
)
SELECT
  c.id,
  'parcial',
  5,
  DATE '2026-08-01',
  DATE '2026-08-31',
  'rascunho',
  $NOTAS$1. (1.4) Custo Efetivo de Vale Transporte — ÚNICA rubrica sem execução no período. Não houve pagamento em razão de dispensa formal do benefício pela colaboradora beneficiária, conforme faculdade prevista no art. 5º do Decreto 95.247/87, que regulamenta a Lei 7.418/85. A declaração de dispensa encontra-se arquivada na sede da OSC à disposição da fiscalização. Execução acumulada no exercício: R$ 236,28 de um previsto acumulado de R$ 590,70, restando R$ 354,42 não executados, mantidos em saldo para os meses subsequentes ou para devolução ao final da vigência.

2. (1.1) Salários e Adicionais — Execução abaixo do previsto mensal em razão do gozo de férias da colaboradora Luzenilda Maria dos Santos (CPF 684.235.787-04), psicóloga, no período de 01/08 a 30/08/2026 (30 dias), cuja remuneração foi antecipada e integralmente paga na competência de julho/2026, nos termos do art. 145 da CLT. Houve retorno ao trabalho em 31/08/2026, sendo custeado 1 (um) dia proporcional ao teto da rubrica (R$ 2.527,17 / 31 dias = R$ 81,52). Os valores lançados observam estritamente os limites por função fixados no Plano de Trabalho aprovado; as diferenças em relação à remuneração efetiva dos empregados são suportadas pela OSC com recursos próprios, não onerando o presente convênio.

3. (1.2) Encargos Patronais — Recolhimento proporcional à folha efetivamente custeada pelo convênio no mês (29% sobre R$ 4.306,29).

4. (1.3) Provisionamento — Sem execução no período; a liquidação da provisão de férias da colaboradora referida ocorreu na competência de julho/2026.$NOTAS$
FROM caritas_convenios c
WHERE c.numero = '001/FMAS/2025';

-- Conferência: deve retornar 1 linha com a 5ª parcela de agosto
SELECT id, numero_parcela, periodo_inicio, periodo_fim, status
FROM caritas_prestacoes_contas
WHERE periodo_inicio = DATE '2026-08-01'
  AND periodo_fim = DATE '2026-08-31';
