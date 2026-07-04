-- ============================================================================
-- RCC GRUPO DANIEL — Schema base
-- Gestão de grupo de oração: membros, finanças, PIX, frequência, agenda,
-- avisos e pedidos de oração.
-- ============================================================================
-- Convenções:
--   • Prefixo "rcc_" em todas as tabelas (escopo do sistema)
--   • UUIDs como PK (compat com auth.users do Supabase)
--   • timestamptz + updated_at via trigger
--   • Valores monetários: NUMERIC(12,2)
--   • Acesso: app usa service-role + checagem de permissão por perfil na
--     camada de aplicação. RLS habilitado com política deny-all para o anon.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Helper: trigger genérico de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rcc_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABELAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- rcc_members — Membros do grupo de oração
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  photo_url       TEXT,
  birth_date      DATE,
  phone           TEXT,
  whatsapp        TEXT,
  email           TEXT,
  address         TEXT,
  gender          TEXT CHECK (gender IN ('masculino','feminino')),
  marital_status  TEXT CHECK (marital_status IN ('solteiro','casado','viuvo','divorciado','uniao_estavel','outro')),
  ministry        TEXT,                     -- ministério (intercessão, música, pregação...)
  cell_group      TEXT,                     -- célula / pequeno grupo
  role_in_group   TEXT,                     -- cargo/função (coordenador, líder, servo...)
  joined_at       DATE,
  status          TEXT NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','inativo','visitante','afastado')),
  notes           TEXT,                     -- observações pastorais
  accepted_terms  BOOLEAN NOT NULL DEFAULT false,
  accepted_terms_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rcc_members_status ON rcc_members(status);
CREATE INDEX idx_rcc_members_name ON rcc_members(full_name);
CREATE TRIGGER trg_rcc_members_updated
  BEFORE UPDATE ON rcc_members
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_users — Usuários do app (vinculados a auth.users e opcionalmente a um membro)
-- Perfis: admin (coordenador), tesoureiro, lider, membro
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_users (
  id              UUID PRIMARY KEY,          -- = auth.users.id
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'membro'
                  CHECK (role IN ('admin','tesoureiro','lider','membro')),
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','ativo','bloqueado')),
  member_id       UUID REFERENCES rcc_members(id) ON DELETE SET NULL,
  -- líder: células/ministérios que pode acompanhar (frequência)
  led_groups      TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_rcc_users_updated
  BEFORE UPDATE ON rcc_users
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_suppliers — Fornecedores (despesas)
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  document        TEXT,                      -- CNPJ ou CPF (opcional)
  phone           TEXT,
  email           TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_rcc_suppliers_updated
  BEFORE UPDATE ON rcc_suppliers
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_financial_transactions — Receitas e despesas
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_financial_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL CHECK (type IN ('income','expense')),
  -- receitas: dizimo, oferta, doacao, evento, campanha, venda, outro
  -- despesas: evento, material, caridade, alimentacao, transporte, aluguel,
  --           manutencao, comunicacao, outro
  category        TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date            DATE NOT NULL,
  description     TEXT,
  payment_method  TEXT CHECK (payment_method IN ('pix','dinheiro','cartao','transferencia','outro')),
  -- receitas: confirmado | pendente | cancelado
  -- despesas: pago      | pendente | cancelado
  status          TEXT NOT NULL DEFAULT 'confirmado'
                  CHECK (status IN ('confirmado','pago','pendente','cancelado')),
  member_id       UUID REFERENCES rcc_members(id) ON DELETE SET NULL,
  supplier_id     UUID REFERENCES rcc_suppliers(id) ON DELETE SET NULL,
  attachment_url  TEXT,
  created_by      UUID REFERENCES rcc_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rcc_fin_type_date ON rcc_financial_transactions(type, date);
CREATE INDEX idx_rcc_fin_status ON rcc_financial_transactions(status);
CREATE TRIGGER trg_rcc_fin_updated
  BEFORE UPDATE ON rcc_financial_transactions
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_pix_payments — Cobranças/doações via PIX
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_pix_payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id      UUID REFERENCES rcc_financial_transactions(id) ON DELETE SET NULL,
  member_id           UUID REFERENCES rcc_members(id) ON DELETE SET NULL,
  amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  contribution_type   TEXT NOT NULL DEFAULT 'oferta'
                      CHECK (contribution_type IN ('dizimo','oferta','campanha','doacao')),
  anonymous           BOOLEAN NOT NULL DEFAULT false,
  txid                TEXT NOT NULL UNIQUE,      -- identificador da cobrança
  pix_copy_paste      TEXT,                      -- BR Code copia-e-cola
  external_payment_id TEXT,                      -- id no gateway (quando integrado)
  status              TEXT NOT NULL DEFAULT 'aguardando'
                      CHECK (status IN ('aguardando','confirmado','expirado','cancelado')),
  expires_at          TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rcc_pix_status ON rcc_pix_payments(status);
CREATE TRIGGER trg_rcc_pix_updated
  BEFORE UPDATE ON rcc_pix_payments
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_attendance_meetings — Reuniões / encontros (para frequência)
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_attendance_meetings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'grupo_oracao'
                  CHECK (type IN ('grupo_oracao','celula','retiro','seminario','formacao','reuniao_interna','outro')),
  date            DATE NOT NULL,
  time            TIME,
  location        TEXT,
  cell_group      TEXT,                      -- célula/ministério (escopo do líder)
  leader_id       UUID REFERENCES rcc_users(id) ON DELETE SET NULL,
  visitors_count  INT NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rcc_meetings_date ON rcc_attendance_meetings(date);
CREATE TRIGGER trg_rcc_meetings_updated
  BEFORE UPDATE ON rcc_attendance_meetings
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_attendance_records — Presença por membro em cada reunião
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_attendance_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id      UUID NOT NULL REFERENCES rcc_attendance_meetings(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES rcc_members(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'present'
                  CHECK (status IN ('present','absent','justified')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);

CREATE TRIGGER trg_rcc_att_records_updated
  BEFORE UPDATE ON rcc_attendance_records
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_events — Agenda de eventos
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'grupo_oracao'
                  CHECK (type IN ('grupo_oracao','celula','retiro','seminario','formacao','reuniao_interna','outro')),
  description     TEXT,
  date            DATE NOT NULL,
  start_time      TIME,
  end_time        TIME,
  location        TEXT,
  responsible_id  UUID REFERENCES rcc_users(id) ON DELETE SET NULL,
  notify_members  BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rcc_events_date ON rcc_events(date);
CREATE TRIGGER trg_rcc_events_updated
  BEFORE UPDATE ON rcc_events
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_announcements — Mural de avisos
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'comunicado'
                  CHECK (type IN ('comunicado','pedido_oracao','escala','convite','campanha','financeiro','formacao')),
  target_audience TEXT NOT NULL DEFAULT 'todos'
                  CHECK (target_audience IN ('todos','membros','lideres','tesouraria','coordenacao')),
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  publish_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES rcc_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_rcc_ann_updated
  BEFORE UPDATE ON rcc_announcements
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_prayer_requests — Pedidos de oração
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_prayer_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       UUID REFERENCES rcc_members(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'outro'
                  CHECK (category IN ('saude','familia','trabalho','espiritual','agradecimento','outro')),
  visibility      TEXT NOT NULL DEFAULT 'publico'
                  CHECK (visibility IN ('publico','privado')),
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','ativo','atendido','arquivado')),
  approved_by     UUID REFERENCES rcc_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_rcc_prayer_updated
  BEFORE UPDATE ON rcc_prayer_requests
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ----------------------------------------------------------------------------
-- rcc_audit_logs — Log básico de criação/alteração em dados financeiros (LGPD)
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID,
  action          TEXT NOT NULL,             -- create | update | delete | approve...
  entity          TEXT NOT NULL,             -- financial_transaction, pix_payment...
  entity_id       UUID,
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rcc_audit_entity ON rcc_audit_logs(entity, entity_id);

-- ----------------------------------------------------------------------------
-- rcc_settings — Configurações do grupo (linha única)
-- ----------------------------------------------------------------------------
CREATE TABLE rcc_settings (
  id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  group_name      TEXT NOT NULL DEFAULT 'RCC Grupo Daniel',
  pix_key         TEXT,
  pix_merchant_name TEXT DEFAULT 'RCC GRUPO DANIEL',
  pix_merchant_city TEXT DEFAULT 'NOVA IGUACU',
  meeting_weekday TEXT,                      -- ex: "Toda quinta, 19h30"
  meeting_place   TEXT,
  moderate_prayers BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO rcc_settings (id) VALUES (1);

CREATE TRIGGER trg_rcc_settings_updated
  BEFORE UPDATE ON rcc_settings
  FOR EACH ROW EXECUTE FUNCTION rcc_set_updated_at();

-- ============================================================================
-- RLS — deny-all para anon/authenticated (o app acessa via service role e
-- aplica as permissões por perfil na camada de aplicação)
-- ============================================================================
ALTER TABLE rcc_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_pix_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_attendance_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rcc_settings ENABLE ROW LEVEL SECURITY;
