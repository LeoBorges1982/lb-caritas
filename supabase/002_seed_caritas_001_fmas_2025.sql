-- ============================================================================
-- LB CARITAS — Seed: Convênio 001/FMAS/2025
-- Cáritas Diocesana de Nova Iguaçu · SEMAS/FMAS · Lei 13.019/2014
-- ============================================================================
-- Pré-requisitos: 001_schema_caritas.sql já executado.
-- Pode ser rodado várias vezes? Não — usa UPSERT só onde tem UNIQUE.
--   Se precisar regerar, rode antes:
--     DELETE FROM caritas_lancamentos WHERE convenio_id IN (SELECT id FROM caritas_convenios WHERE numero='001/FMAS/2025');
--     DELETE FROM caritas_metas WHERE convenio_id IN (SELECT id FROM caritas_convenios WHERE numero='001/FMAS/2025');
--     DELETE FROM caritas_categorias_despesa WHERE convenio_id IN (SELECT id FROM caritas_convenios WHERE numero='001/FMAS/2025');
--     DELETE FROM caritas_plano_trabalho WHERE convenio_id IN (SELECT id FROM caritas_convenios WHERE numero='001/FMAS/2025');
--     DELETE FROM caritas_convenios WHERE numero='001/FMAS/2025';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Tabela auxiliar de vedações (Lei 13.019, art. 45 + Decreto Municipal)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caritas_vedacoes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id   UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  descricao     TEXT NOT NULL,
  base_legal    TEXT,
  ativa         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vedacoes_convenio ON caritas_vedacoes(convenio_id);

ALTER TABLE caritas_vedacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vedacoes_acesso" ON caritas_vedacoes;
CREATE POLICY "vedacoes_acesso" ON caritas_vedacoes FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

-- ----------------------------------------------------------------------------
-- 1) Insere OSC, Órgão, Convênio, Plano, Metas, Categorias e Vedações
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_osc_id        UUID;
  v_orgao_id      UUID;
  v_convenio_id   UUID;
  v_plano_id      UUID;
BEGIN

  -- ============================================================
  -- OSC: Cáritas Diocesana de Nova Iguaçu
  -- ============================================================
  INSERT INTO caritas_oscs (
    nome, cnpj, endereco, cidade, estado, cep,
    telefone, email, responsavel, responsavel_cpf, observacoes
  ) VALUES (
    'Cáritas Diocesana de Nova Iguaçu — Casa da Solidariedade',
    '28.732.246/0024-63',
    'Av. Getúlio de Moura, 1222 - Centro',
    'Nova Iguaçu',
    'RJ',
    '26.221-040',
    '(21) 99388-5815 / (21) 2767-7677',
    'acasosolidariedade@hotmail.com',
    'Padre Davenir Andrade',  -- Diretor-Presidente atual
    NULL,
    'CNPJ matriz (titular da conta bancária): 28.732.246/0001-77. ' ||
    'Representante legal que assinou o Termo: Padre Felix Poschenreithner — CPF 059.204.027-50. ' ||
    'Responsável Técnico: Andreia Florencio Felicio Pereira — CPF 030.212.007-61 (Coord. Administrativa). ' ||
    'Diretor-Tesoureiro: Leonardo da Silva Borges. ' ||
    'Contador: Leonardo Borges — CRC-RJ 091024/O — LB Assessoria Empresarial Ltda. ' ||
    'Registro: 1496 "A 6" do Cartório do 3º Ofício. ' ||
    'Utilidade Pública Federal: nº 93.540 de 07/11/1986. ' ||
    'Mandato Diretoria: 01/05/2023 a 30/04/2026. ' ||
    'E-mail secundário: caritasdiocesana@outlook.com.'
  )
  ON CONFLICT (cnpj) DO UPDATE SET nome = EXCLUDED.nome
  RETURNING id INTO v_osc_id;

  -- ============================================================
  -- Órgão Concedente: SEMAS / Município de Nova Iguaçu / FMAS
  -- ============================================================
  INSERT INTO caritas_orgaos_concedentes (
    nome, sigla, esfera, cnpj, municipio, estado, endereco, fundo
  ) VALUES (
    'Secretaria Municipal de Assistência Social de Nova Iguaçu',
    'SEMAS',
    'municipal',
    '08.969.291/0001-32',  -- CNPJ do FMAS (gestor financeiro)
    'Nova Iguaçu',
    'RJ',
    'Rua Dr. Luiz Guimarães, 956 - Centro - Nova Iguaçu/RJ · Tel: (21) 2694-7113',
    'FMAS — Fundo Municipal de Assistência Social (CNPJ 08.969.291/0001-32)'
  )
  RETURNING id INTO v_orgao_id;

  -- ============================================================
  -- Convênio 001/FMAS/2025
  -- ============================================================
  INSERT INTO caritas_convenios (
    numero, tipo, osc_id, orgao_id,
    objeto, publico_alvo, territorio,
    valor_total, valor_repasse, valor_contrapartida, rendimentos,
    data_assinatura, vigencia_inicio, vigencia_fim,
    banco, agencia, conta_corrente, conta_aplicacao,
    gestor_publico, gestor_osc,
    status, observacoes
  ) VALUES (
    '001/FMAS/2025',
    'colaboracao',
    v_osc_id,
    v_orgao_id,
    'Implementação do Núcleo de Expansão do Serviço de Atendimento à Pessoa em Situação de Rua',
    'Adultos a partir de 18 anos em situação de rua — capacidade de 80 pessoas/dia',
    'Município de Nova Iguaçu/RJ',
    155404.44,    -- valor total
    155404.44,    -- valor repasse (sem contrapartida)
    0,
    0,
    '2025-03-24',  -- data assinatura
    '2025-04-01',  -- vigência início
    '2027-04-01',  -- vigência fim (já prorrogada pelo 1º aditivo)
    'Caixa Econômica Federal (104)',
    '0185',
    'Op. 1292 — Conta 000577598731-0',
    'Op. 5948 — CAIXA FIC GIRO MPE RF REF DI LP (CNPJ 10.551.370/0001-70)',
    'Guisela Campana Portela — Matrícula 60/716.210-0 (Gestora do FMAS)',
    'Andreia Florencio Felicio Pereira — CPF 030.212.007-61 (Coord. Administrativa)',
    'vigente',
    'Processo administrativo: 2024/103819. ' ||
    'Chamamento Público: 001/2025. ' ||
    'Edital: Chamamento Público nº 001/2025. ' ||
    'Programa de Trabalho: 03.30.01.08.244.5074.2175. ' ||
    'Natureza da Despesa: 3.3.50.43. ' ||
    'Fonte de Recursos: 1500/1660/1661. ' ||
    'Nota de Empenho: 160/2025 — R$ 116.553,33. ' ||
    'Publicação no DOM: 27/03/2025. ' ||
    'Base legal: Lei Federal 13.019/2014 + Decreto Municipal 11.252/2018. ' ||
    'Cronograma: 12 parcelas mensais de R$ 12.950,37 (último dia útil de cada mês), abril/2025 a março/2026. ' ||
    '1º Termo Aditivo: assinado em 30/03/2026 — prorrogação da vigência até 01/04/2027. ' ||
    'CNPJ filial titular do convênio: 28.732.246/0024-63. ' ||
    'CNPJ matriz titular da conta bancária: 28.732.246/0001-77. ' ||
    'Pendência: conta corrente NÃO está isenta de tarifas (Cl. 3ª xii exige isenção — regularizar com a Caixa).'
  )
  RETURNING id INTO v_convenio_id;

  -- ============================================================
  -- Plano de Trabalho (versão 1)
  -- ============================================================
  INSERT INTO caritas_plano_trabalho (
    convenio_id, versao, titulo, justificativa, metodologia,
    cronograma_resumo, aprovado_em, vigente, observacoes
  ) VALUES (
    v_convenio_id, 1,
    'Núcleo de Expansão do Serviço de Atendimento à Pessoa em Situação de Rua',
    'Expansão do serviço da Proteção Social Especial de Média Complexidade, ' ||
    'com foco em adultos em situação de rua no município de Nova Iguaçu.',
    'Serviço de Convivência e Fortalecimento de Vínculos — ' ||
    'oferta diária de alimentação, higiene, atendimento social e psicológico, ' ||
    'palestras e atividades culturais. Equipe multiprofissional (Serviço Social, ' ||
    'Psicologia e Cozinha).',
    '12 meses de execução com repasses mensais; ' ||
    'funcionamento de segunda a sexta, 7h30 às 14h.',
    '2025-03-24',
    true,
    'Tipo de Proteção: Especial Média Complexidade. ' ||
    'Serviço Socioassistencial: Convivência e Fortalecimento de Vínculos. ' ||
    'Faixa etária: 18+. Capacidade: 80 pessoas/dia.'
  )
  RETURNING id INTO v_plano_id;

  -- ============================================================
  -- Metas (5 objetivos · 9 metas)
  -- ============================================================
  INSERT INTO caritas_metas (
    plano_id, convenio_id, codigo, titulo, descricao,
    indicador, meio_verificacao, quantidade_prevista, unidade_medida,
    valor_previsto, data_inicio, data_fim, ordem
  ) VALUES
  -- Objetivo 1 — ORIENTAR
  (v_plano_id, v_convenio_id, '1a',
   'OBJETIVO 1 · Café da manhã',
   'Fornecimento de café da manhã (orientação para higiene, alimentação, medicamentos e saúde)',
   'Nº de cafés da manhã servidos/dia', 'Lista de presença + planilha do refeitório',
   80, 'pessoas/dia', 0, '2025-04-01', '2027-04-01', 11),

  (v_plano_id, v_convenio_id, '1b',
   'OBJETIVO 1 · Almoço',
   'Fornecimento de almoço',
   'Nº de almoços servidos/dia', 'Lista de presença + planilha do refeitório',
   80, 'pessoas/dia', 0, '2025-04-01', '2027-04-01', 12),

  (v_plano_id, v_convenio_id, '1c',
   'OBJETIVO 1 · Higiene pessoal',
   'Espaço para higiene pessoal',
   'Nº de atendimentos de higiene/dia', 'Registro diário no plantão',
   80, 'pessoas/dia', 0, '2025-04-01', '2027-04-01', 13),

  -- Objetivo 2 — PROMOVER acesso a benefícios e serviços socioassistenciais
  (v_plano_id, v_convenio_id, '2a',
   'OBJETIVO 2 · Serviço Social + documentação',
   'Atendimento de Serviço Social + 1ª/2ª via de documentos',
   'Nº de atendimentos sociais/dia', 'Prontuário socioassistencial',
   15, 'pessoas/dia', 0, '2025-04-01', '2027-04-01', 21),

  (v_plano_id, v_convenio_id, '2b',
   'OBJETIVO 2 · Atendimento psicossocial',
   'Atendimento psicossocial e psicológico',
   'Nº de atendimentos psicológicos/dia', 'Prontuário clínico',
   10, 'pessoas/dia', 0, '2025-04-01', '2027-04-01', 22),

  (v_plano_id, v_convenio_id, '2c',
   'OBJETIVO 2 · Grupo Motivacional',
   'Grupo Motivacional (semanal)',
   'Nº de participantes/semana', 'Lista de presença',
   60, 'pessoas/semana', 0, '2025-04-01', '2027-04-01', 23),

  -- Objetivo 3 — CONSCIENTIZAR sobre substâncias químicas
  (v_plano_id, v_convenio_id, '3a',
   'OBJETIVO 3 · Palestras AA/NA',
   'Palestras AA/NA (quinzenal) — conscientização sobre riscos de substâncias químicas',
   'Nº de participantes/quinzena', 'Lista de presença + ata',
   15, 'pessoas/quinzena', 0, '2025-04-01', '2027-04-01', 31),

  -- Objetivo 4 — PROMOVER acesso a serviços setoriais
  (v_plano_id, v_convenio_id, '4a',
   'OBJETIVO 4 · Consultório na Rua',
   'Atendimento Consultório na Rua (semanal)',
   'Nº de atendimentos de saúde/semana', 'Relatório do Consultório na Rua',
   15, 'pessoas/semana', 0, '2025-04-01', '2027-04-01', 41),

  -- Objetivo 5 — Atividades lúdicas/culturais
  (v_plano_id, v_convenio_id, '5a',
   'OBJETIVO 5 · Cinema e atividades culturais',
   'Sessão de cinema e atividades lúdicas/culturais (semanal)',
   'Nº de participantes/semana', 'Lista de presença',
   30, 'pessoas/semana', 0, '2025-04-01', '2027-04-01', 51);

  -- ============================================================
  -- Categorias de Despesa (Rubricas)
  -- ============================================================
  INSERT INTO caritas_categorias_despesa (
    convenio_id, codigo, nome, grupo, valor_previsto, permite_remanejamento, ordem
  ) VALUES
  -- Grupo 1 — Recursos Humanos
  (v_convenio_id, '1.1', 'Salários e Adicionais',                         'Recursos Humanos', 81023.28, true, 11),
  (v_convenio_id, '1.2', 'Encargos Patronais (INSS, FGTS, PIS)',          'Recursos Humanos', 23496.84, true, 12),
  (v_convenio_id, '1.3', 'Provisionamento (férias+1/3, 13º, aviso, multa FGTS)', 'Recursos Humanos', 30054.24, true, 13),
  (v_convenio_id, '1.4', 'Vale Transporte',                               'Recursos Humanos',  1417.68, true, 14),
  (v_convenio_id, '1.5', 'Exames Admissionais/Demissionais',              'Recursos Humanos',     0.00, true, 15),
  -- Grupo 2 — Materiais de Consumo
  (v_convenio_id, '2.1', 'Gêneros Alimentícios',                          'Materiais de Consumo', 19412.40, true, 21),
  (v_convenio_id, '2.2', 'Higiene e Limpeza',                             'Materiais de Consumo',     0.00, true, 22),
  (v_convenio_id, '2.3', 'Material de Escritório',                        'Materiais de Consumo',     0.00, true, 23),
  (v_convenio_id, '2.4', 'Outros materiais',                              'Materiais de Consumo',     0.00, true, 24),
  -- Grupo 3 — Prestação de Serviços
  (v_convenio_id, '3.1', 'Serviços PJ',                                   'Prestação de Serviços',    0.00, true, 31),
  (v_convenio_id, '3.2', 'Utilidades Públicas (água/luz/internet)',       'Prestação de Serviços',    0.00, true, 32),
  -- Grupo 4 — Locação
  (v_convenio_id, '4.1', 'Locação de Imóvel',                             'Locação',                  0.00, true, 41),
  (v_convenio_id, '4.2', 'Locação de Bens Móveis',                        'Locação',                  0.00, true, 42),
  -- Grupo 5 — Outras
  (v_convenio_id, '5.0', 'Outras Despesas',                               'Outras',                   0.00, true, 51);

  -- ============================================================
  -- Vedações (Lei 13.019 + Decreto Municipal + Termo)
  -- ============================================================
  INSERT INTO caritas_vedacoes (convenio_id, descricao, base_legal) VALUES
  (v_convenio_id, 'Pagamento a agentes públicos da ativa',                                'Lei 13.019/2014, art. 45'),
  (v_convenio_id, 'Pagamento a cônjuge/parente até 3º grau de dirigentes da OSC',         'Lei 13.019/2014, art. 39'),
  (v_convenio_id, 'Multas, juros e correção monetária por atraso de pagamento da OSC',    'Lei 13.019/2014, art. 45'),
  (v_convenio_id, 'Tarifas bancárias na conta do convênio (conta deve ser isenta)',       'Cláusula 3ª, xii do Termo'),
  (v_convenio_id, 'Despesas anteriores ou posteriores ao período de vigência',            'Lei 13.019/2014, art. 45'),
  (v_convenio_id, 'Transferência a clubes, partidos, associações de servidores',          'Decreto Municipal 11.252/2018'),
  (v_convenio_id, 'Publicidade com promoção pessoal de autoridade ou servidor',           'Lei 13.019/2014, art. 45'),
  (v_convenio_id, 'Obras (salvo pequena adaptação)',                                      'Lei 13.019/2014, art. 45');

  -- ============================================================
  -- Saldo inicial: lança a aplicação financeira residual (R$ 0,02)
  -- ============================================================
  INSERT INTO caritas_lancamentos (
    convenio_id, tipo, data_lancamento, descricao, valor,
    conta_origem, status, observacoes
  ) VALUES (
    v_convenio_id, 'rendimento', '2025-04-01',
    'Saldo residual na conta aplicação na abertura do convênio',
    0.02, 'aplicacao', 'conciliado',
    'Centavos residuais do fundo CAIXA FIC GIRO MPE RF REF DI LP — saldo de abertura.'
  );

END $$;

-- ----------------------------------------------------------------------------
-- 2) Confere os dados inseridos
-- ----------------------------------------------------------------------------
SELECT
  c.numero,
  c.tipo,
  c.status,
  o.nome AS osc,
  org.sigla AS orgao,
  c.valor_total,
  c.vigencia_inicio,
  c.vigencia_fim,
  (SELECT COUNT(*) FROM caritas_metas WHERE convenio_id = c.id) AS qtd_metas,
  (SELECT COUNT(*) FROM caritas_categorias_despesa WHERE convenio_id = c.id) AS qtd_categorias,
  (SELECT COUNT(*) FROM caritas_vedacoes WHERE convenio_id = c.id) AS qtd_vedacoes
FROM caritas_convenios c
JOIN caritas_oscs o ON o.id = c.osc_id
JOIN caritas_orgaos_concedentes org ON org.id = c.orgao_id
WHERE c.numero = '001/FMAS/2025';
