-- ============================================================================
-- LB CARITAS — Schema base
-- Gestão de convênios públicos · Lei Federal 13.019/2014 (MROSC)
-- ============================================================================
-- Convenções:
--   • Prefixo "caritas_" em todas as tabelas (escopo do sistema)
--   • UUIDs como PK (compat com Portal LB / auth.users)
--   • timestamptz + updated_at via trigger
--   • Multi-tenant: usuário vê apenas convênios autorizados em caritas_usuarios_acesso
--                  Admin do Portal (perfis.papel='admin') vê tudo
--   • Valores monetários: NUMERIC(15,2) — até 9.999.999.999.999,99
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Extensões
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) Helper: trigger genérico de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION caritas_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2) Helpers de autorização (SECURITY DEFINER pra bypassar RLS recursivo)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION caritas_eh_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND papel = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION caritas_tem_acesso_convenio(p_convenio_id UUID)
RETURNS BOOLEAN AS $$
  SELECT caritas_eh_admin() OR EXISTS (
    SELECT 1 FROM caritas_usuarios_acesso
    WHERE usuario_id = auth.uid() AND convenio_id = p_convenio_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- TABELAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- caritas_oscs — Organizações da Sociedade Civil (Cáritas e futuras)
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_oscs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  cnpj            TEXT NOT NULL UNIQUE,
  endereco        TEXT,
  cidade          TEXT,
  estado          CHAR(2),
  cep             TEXT,
  telefone        TEXT,
  email           TEXT,
  responsavel     TEXT,             -- representante legal
  responsavel_cpf TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_oscs_updated
  BEFORE UPDATE ON caritas_oscs
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_orgaos_concedentes — Órgão público que repassa o recurso
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_orgaos_concedentes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,    -- ex: "Secretaria Municipal de Assistência Social"
  sigla           TEXT,             -- ex: "SEMAS"
  esfera          TEXT NOT NULL CHECK (esfera IN ('federal','estadual','municipal')),
  cnpj            TEXT,
  municipio       TEXT,             -- ex: "Nova Iguaçu"
  estado          CHAR(2),
  endereco        TEXT,
  fundo           TEXT,             -- ex: "FMAS — Fundo Municipal de Assistência Social"
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_orgaos_updated
  BEFORE UPDATE ON caritas_orgaos_concedentes
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_convenios — A parceria propriamente dita
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_convenios (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              TEXT NOT NULL,           -- ex: "001/FMAS/2025"
  tipo                TEXT NOT NULL CHECK (tipo IN ('colaboracao','fomento','cooperacao')),
  osc_id              UUID NOT NULL REFERENCES caritas_oscs(id) ON DELETE RESTRICT,
  orgao_id            UUID NOT NULL REFERENCES caritas_orgaos_concedentes(id) ON DELETE RESTRICT,

  objeto              TEXT NOT NULL,
  publico_alvo        TEXT,
  territorio          TEXT,                    -- abrangência (bairro/município)

  -- Valores
  valor_total         NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_repasse       NUMERIC(15,2) NOT NULL DEFAULT 0,  -- recurso público
  valor_contrapartida NUMERIC(15,2) NOT NULL DEFAULT 0,  -- contrapartida da OSC
  rendimentos         NUMERIC(15,2) NOT NULL DEFAULT 0,  -- rendimentos da aplicação

  -- Vigência
  data_assinatura     DATE,
  vigencia_inicio     DATE NOT NULL,
  vigencia_fim        DATE NOT NULL,

  -- Conta bancária exclusiva (exigência da Lei 13.019)
  banco               TEXT,
  agencia             TEXT,
  conta_corrente      TEXT,
  conta_aplicacao     TEXT,

  -- Gestão
  gestor_publico      TEXT,                    -- gestor do convênio no órgão
  gestor_osc          TEXT,                    -- coordenador na OSC

  status              TEXT NOT NULL DEFAULT 'em_analise'
                      CHECK (status IN ('em_analise','vigente','suspenso','encerrado','rescindido')),

  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT convenio_vigencia_valida CHECK (vigencia_fim >= vigencia_inicio),
  CONSTRAINT convenio_valor_consistente CHECK (valor_total = valor_repasse + valor_contrapartida)
);

CREATE INDEX idx_convenios_osc ON caritas_convenios(osc_id);
CREATE INDEX idx_convenios_orgao ON caritas_convenios(orgao_id);
CREATE INDEX idx_convenios_status ON caritas_convenios(status);
CREATE INDEX idx_convenios_vigencia ON caritas_convenios(vigencia_fim);

CREATE TRIGGER trg_convenios_updated
  BEFORE UPDATE ON caritas_convenios
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_plano_trabalho — Plano aprovado (versionado pra suportar aditivos)
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_plano_trabalho (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id     UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  versao          INTEGER NOT NULL DEFAULT 1,  -- 1 = original, 2+ = aditivos
  titulo          TEXT,
  justificativa   TEXT,
  metodologia     TEXT,
  cronograma_resumo TEXT,
  aprovado_em     DATE,
  vigente         BOOLEAN NOT NULL DEFAULT true,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (convenio_id, versao)
);

CREATE INDEX idx_plano_convenio ON caritas_plano_trabalho(convenio_id);

CREATE TRIGGER trg_plano_updated
  BEFORE UPDATE ON caritas_plano_trabalho
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_metas — Metas/etapas do plano de trabalho
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_metas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plano_id            UUID NOT NULL REFERENCES caritas_plano_trabalho(id) ON DELETE CASCADE,
  convenio_id         UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  codigo              TEXT NOT NULL,           -- "META 1", "META 1.1", "ETAPA A"
  titulo              TEXT NOT NULL,
  descricao           TEXT,
  indicador           TEXT,                    -- "Nº de atendimentos realizados"
  meio_verificacao    TEXT,                    -- "Listas de presença + relatórios fotográficos"
  quantidade_prevista NUMERIC(15,2),
  unidade_medida      TEXT,                    -- "atendimentos", "horas", "famílias"
  valor_previsto      NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_inicio         DATE,
  data_fim            DATE,
  ordem               INTEGER NOT NULL DEFAULT 0,
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_metas_plano ON caritas_metas(plano_id);
CREATE INDEX idx_metas_convenio ON caritas_metas(convenio_id);

CREATE TRIGGER trg_metas_updated
  BEFORE UPDATE ON caritas_metas
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_categorias_despesa — Rubricas orçamentárias do convênio
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_categorias_despesa (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id     UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  codigo          TEXT NOT NULL,               -- "3.1", "3.3.90.30"
  nome            TEXT NOT NULL,               -- "Recursos Humanos", "Material de Consumo"
  grupo           TEXT,                        -- "Custeio", "Capital"
  valor_previsto  NUMERIC(15,2) NOT NULL DEFAULT 0,
  permite_remanejamento BOOLEAN NOT NULL DEFAULT false,
  ordem           INTEGER NOT NULL DEFAULT 0,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (convenio_id, codigo)
);

CREATE INDEX idx_categorias_convenio ON caritas_categorias_despesa(convenio_id);

CREATE TRIGGER trg_categorias_updated
  BEFORE UPDATE ON caritas_categorias_despesa
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_lancamentos — Movimentações financeiras
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_lancamentos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id         UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  meta_id             UUID REFERENCES caritas_metas(id) ON DELETE SET NULL,
  categoria_id        UUID REFERENCES caritas_categorias_despesa(id) ON DELETE SET NULL,

  tipo                TEXT NOT NULL CHECK (tipo IN (
                        'repasse',      -- entrada de recurso do órgão
                        'rendimento',   -- rendimento de aplicação
                        'devolucao',    -- devolução de saldo
                        'despesa',      -- saída (pagamento)
                        'estorno'       -- correção
                      )),

  data_lancamento     DATE NOT NULL,           -- data contábil
  data_pagamento      DATE,                    -- data efetiva no extrato
  descricao           TEXT NOT NULL,
  valor               NUMERIC(15,2) NOT NULL,  -- sempre positivo (sinal vem do tipo)

  -- Fornecedor/credor (para despesas)
  fornecedor_nome     TEXT,
  fornecedor_documento TEXT,                   -- CNPJ ou CPF

  -- Documento fiscal
  documento_tipo      TEXT CHECK (documento_tipo IN ('nf','nfse','recibo','rpa','folha','outros') OR documento_tipo IS NULL),
  documento_numero    TEXT,
  documento_data      DATE,
  documento_valor     NUMERIC(15,2),

  -- Pagamento
  forma_pagamento     TEXT CHECK (forma_pagamento IN ('pix','ted','doc','cheque','debito','dinheiro') OR forma_pagamento IS NULL),
  conta_origem        TEXT,                    -- "corrente" / "aplicacao"

  -- Conciliação e auditoria
  status              TEXT NOT NULL DEFAULT 'previsto'
                      CHECK (status IN ('previsto','realizado','conciliado','glosado','cancelado')),
  conciliado_em       DATE,
  glosa_motivo        TEXT,
  glosa_valor         NUMERIC(15,2),

  observacoes         TEXT,
  criado_por          UUID REFERENCES auth.users(id),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT lanc_valor_positivo CHECK (valor > 0)
);

CREATE INDEX idx_lanc_convenio ON caritas_lancamentos(convenio_id);
CREATE INDEX idx_lanc_data ON caritas_lancamentos(data_lancamento);
CREATE INDEX idx_lanc_meta ON caritas_lancamentos(meta_id);
CREATE INDEX idx_lanc_categoria ON caritas_lancamentos(categoria_id);
CREATE INDEX idx_lanc_status ON caritas_lancamentos(status);
CREATE INDEX idx_lanc_tipo ON caritas_lancamentos(tipo);

CREATE TRIGGER trg_lanc_updated
  BEFORE UPDATE ON caritas_lancamentos
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_balancetes — Consolidado mensal
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_balancetes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id     UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  mes_referencia  DATE NOT NULL,               -- sempre dia 01
  saldo_inicial   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_entradas  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_saidas    NUMERIC(15,2) NOT NULL DEFAULT 0,
  rendimentos     NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_final     NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'aberto'
                  CHECK (status IN ('aberto','fechado','enviado','aprovado')),
  fechado_em      TIMESTAMPTZ,
  fechado_por     UUID REFERENCES auth.users(id),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (convenio_id, mes_referencia)
);

CREATE INDEX idx_balancetes_convenio ON caritas_balancetes(convenio_id);
CREATE INDEX idx_balancetes_mes ON caritas_balancetes(mes_referencia);

CREATE TRIGGER trg_balancetes_updated
  BEFORE UPDATE ON caritas_balancetes
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_prestacoes_contas — Parciais e final
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_prestacoes_contas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id     UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('parcial','final')),
  periodo_inicio  DATE NOT NULL,
  periodo_fim     DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho','protocolada','em_analise','aprovada','aprovada_ressalvas','rejeitada')),
  protocolo       TEXT,                        -- nº do protocolo no órgão
  protocolada_em  DATE,
  analisada_em    DATE,
  parecer_tecnico TEXT,
  glosa_total     NUMERIC(15,2) NOT NULL DEFAULT 0,
  responsavel_id  UUID REFERENCES auth.users(id),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pc_periodo_valido CHECK (periodo_fim >= periodo_inicio)
);

CREATE INDEX idx_pc_convenio ON caritas_prestacoes_contas(convenio_id);
CREATE INDEX idx_pc_status ON caritas_prestacoes_contas(status);

CREATE TRIGGER trg_pc_updated
  BEFORE UPDATE ON caritas_prestacoes_contas
  FOR EACH ROW EXECUTE FUNCTION caritas_set_updated_at();

-- ----------------------------------------------------------------------------
-- caritas_alertas — Operacionais (vencimento, saldo, glosa, etc)
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_alertas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id     UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,               -- 'vencimento_convenio','saldo_critico','prestacao_pendente','limite_categoria','glosa'
  severidade      TEXT NOT NULL DEFAULT 'info'
                  CHECK (severidade IN ('info','aviso','critico')),
  titulo          TEXT NOT NULL,
  mensagem        TEXT,
  vencimento      DATE,                        -- quando o problema "estoura"
  resolvido       BOOLEAN NOT NULL DEFAULT false,
  resolvido_em    TIMESTAMPTZ,
  resolvido_por   UUID REFERENCES auth.users(id),
  metadata        JSONB,                       -- dados extras (ex: lancamento_id, categoria_id)
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alertas_convenio ON caritas_alertas(convenio_id);
CREATE INDEX idx_alertas_resolvido ON caritas_alertas(resolvido) WHERE resolvido = false;
CREATE INDEX idx_alertas_severidade ON caritas_alertas(severidade);

-- ----------------------------------------------------------------------------
-- caritas_anexos — Documentos polimórficos (NF, recibo, extrato, etc)
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_anexos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id     UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  entidade        TEXT NOT NULL CHECK (entidade IN ('convenio','plano','meta','lancamento','balancete','prestacao')),
  entidade_id     UUID NOT NULL,
  tipo            TEXT,                        -- 'nf','recibo','extrato','termo','foto','contrato','outros'
  nome            TEXT NOT NULL,
  bucket          TEXT NOT NULL DEFAULT 'caritas-anexos',
  caminho         TEXT NOT NULL,               -- path no storage
  mime_type       TEXT,
  tamanho_bytes   BIGINT,
  enviado_por     UUID REFERENCES auth.users(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anexos_convenio ON caritas_anexos(convenio_id);
CREATE INDEX idx_anexos_entidade ON caritas_anexos(entidade, entidade_id);

-- ----------------------------------------------------------------------------
-- caritas_usuarios_acesso — Controle multi-tenant
-- ----------------------------------------------------------------------------
CREATE TABLE caritas_usuarios_acesso (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  convenio_id     UUID NOT NULL REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  papel           TEXT NOT NULL CHECK (papel IN ('visualizador','operador','gestor')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (usuario_id, convenio_id)
);

CREATE INDEX idx_usracesso_usuario ON caritas_usuarios_acesso(usuario_id);
CREATE INDEX idx_usracesso_convenio ON caritas_usuarios_acesso(convenio_id);

-- ============================================================================
-- RLS — Row Level Security
-- ============================================================================

ALTER TABLE caritas_oscs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_orgaos_concedentes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_convenios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_plano_trabalho        ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_metas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_categorias_despesa    ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_lancamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_balancetes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_prestacoes_contas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_alertas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_anexos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE caritas_usuarios_acesso       ENABLE ROW LEVEL SECURITY;

-- OSCs e órgãos: leitura livre pra autenticados, escrita só admin
CREATE POLICY "oscs_leitura" ON caritas_oscs FOR SELECT TO authenticated USING (true);
CREATE POLICY "oscs_admin" ON caritas_oscs FOR ALL TO authenticated
  USING (caritas_eh_admin()) WITH CHECK (caritas_eh_admin());

CREATE POLICY "orgaos_leitura" ON caritas_orgaos_concedentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgaos_admin" ON caritas_orgaos_concedentes FOR ALL TO authenticated
  USING (caritas_eh_admin()) WITH CHECK (caritas_eh_admin());

-- Convênios: só convenios autorizados (ou admin)
CREATE POLICY "convenios_acesso" ON caritas_convenios FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(id))
  WITH CHECK (caritas_eh_admin());

-- Tabelas filhas: derivam acesso do convenio_id
CREATE POLICY "plano_acesso" ON caritas_plano_trabalho FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

CREATE POLICY "metas_acesso" ON caritas_metas FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

CREATE POLICY "categorias_acesso" ON caritas_categorias_despesa FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

CREATE POLICY "lancamentos_acesso" ON caritas_lancamentos FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

CREATE POLICY "balancetes_acesso" ON caritas_balancetes FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

CREATE POLICY "prestacoes_acesso" ON caritas_prestacoes_contas FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

CREATE POLICY "alertas_acesso" ON caritas_alertas FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

CREATE POLICY "anexos_acesso" ON caritas_anexos FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

-- Tabela de permissões: cada um vê só os próprios; admin gerencia tudo
CREATE POLICY "usracesso_proprio" ON caritas_usuarios_acesso FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR caritas_eh_admin());

CREATE POLICY "usracesso_admin" ON caritas_usuarios_acesso FOR ALL TO authenticated
  USING (caritas_eh_admin()) WITH CHECK (caritas_eh_admin());

-- ============================================================================
-- VIEWS úteis
-- ============================================================================

-- Saldo atual por convênio (somando lançamentos)
CREATE OR REPLACE VIEW caritas_v_saldo_convenio AS
SELECT
  c.id AS convenio_id,
  c.numero,
  c.valor_total,
  COALESCE(SUM(CASE WHEN l.tipo IN ('repasse','rendimento') AND l.status <> 'cancelado' THEN l.valor ELSE 0 END), 0) AS total_entradas,
  COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.status NOT IN ('cancelado','glosado') THEN l.valor ELSE 0 END), 0) AS total_saidas,
  COALESCE(SUM(CASE WHEN l.tipo IN ('repasse','rendimento') AND l.status <> 'cancelado' THEN l.valor ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.status NOT IN ('cancelado','glosado') THEN l.valor ELSE 0 END), 0) AS saldo_atual
FROM caritas_convenios c
LEFT JOIN caritas_lancamentos l ON l.convenio_id = c.id
GROUP BY c.id, c.numero, c.valor_total;

-- ============================================================================
-- COMMENTS (documentação inline pro dashboard do Supabase)
-- ============================================================================
COMMENT ON TABLE caritas_convenios IS 'Parcerias da Lei 13.019/2014 (termos de colaboração/fomento/cooperação)';
COMMENT ON TABLE caritas_plano_trabalho IS 'Plano de trabalho aprovado — versionado pra suportar aditivos';
COMMENT ON TABLE caritas_metas IS 'Metas/etapas físicas do plano de trabalho';
COMMENT ON TABLE caritas_categorias_despesa IS 'Rubricas orçamentárias do convênio';
COMMENT ON TABLE caritas_lancamentos IS 'Movimentações financeiras (entradas, despesas, rendimentos, estornos)';
COMMENT ON TABLE caritas_balancetes IS 'Consolidado mensal de movimentação';
COMMENT ON TABLE caritas_prestacoes_contas IS 'Prestações de contas parciais e final';
COMMENT ON TABLE caritas_alertas IS 'Alertas operacionais (prazos, saldo crítico, glosas)';
COMMENT ON TABLE caritas_anexos IS 'Documentos vinculados a qualquer entidade do convênio';
COMMENT ON TABLE caritas_usuarios_acesso IS 'Quem pode acessar quais convênios (multi-tenant)';
