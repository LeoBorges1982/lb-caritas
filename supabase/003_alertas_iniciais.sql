-- ============================================================================
-- Alertas iniciais do convênio piloto
-- Pendências conhecidas no momento da implantação
-- ============================================================================

INSERT INTO caritas_alertas (convenio_id, tipo, severidade, titulo, mensagem)
SELECT
  id, 'documentacao_pendente', 'critico',
  'Ata da diretoria pendente de registro em cartório',
  'A conta bancária do convênio (CEF Op. 1292 / 000577598731-0) está bloqueada para movimentação até o registro da ata da diretoria no Cartório do 3º Ofício. Sem isso a Caixa não libera repasses nem permite débitos. Acompanhar com a OSC e formalizar a pendência via ofício pra SEMAS.'
FROM caritas_convenios
WHERE numero = '001/FMAS/2025'
ON CONFLICT DO NOTHING;

INSERT INTO caritas_alertas (convenio_id, tipo, severidade, titulo, mensagem)
SELECT
  id, 'irregularidade_bancaria', 'aviso',
  'Conta corrente não está isenta de tarifas',
  'A Cláusula 3ª, xii do Termo exige que a conta do convênio seja isenta de tarifas. Hoje a conta está sujeita a cobrança. Solicitar a regularização junto à agência da CEF para evitar glosa em prestação de contas.'
FROM caritas_convenios
WHERE numero = '001/FMAS/2025'
ON CONFLICT DO NOTHING;

SELECT severidade, COUNT(*) FROM caritas_alertas GROUP BY severidade;
