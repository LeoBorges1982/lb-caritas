-- ============================================================================
-- Convites de assinatura — um link por signatário
-- ============================================================================
-- Cada responsável recebe um link exclusivo, abre, confere o documento,
-- confirma o próprio CPF e assina. Não precisa ter login no sistema.
--
-- Assim a trilha de auditoria registra o acesso REAL de cada pessoa (IP,
-- navegador, horário), em vez de todas as assinaturas saírem no e-mail de
-- quem operou o sistema.
--
-- O token é a credencial de acesso: 32 bytes aleatórios (256 bits). Quem
-- tem o link consegue abrir o convite, mas só assina se acertar o CPF
-- cadastrado no convênio.
-- ============================================================================

CREATE TABLE IF NOT EXISTS caritas_convites_assinatura (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token                 TEXT NOT NULL UNIQUE,

  convenio_id           UUID REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  entidade              TEXT NOT NULL DEFAULT 'prestacao'
                        CHECK (entidade IN ('prestacao','balancete')),
  entidade_id           UUID NOT NULL,

  -- Quem deve assinar
  papel                 TEXT NOT NULL
                        CHECK (papel IN ('gestor_osc','elaborador','responsavel_legal','contabilista')),
  nome                  TEXT NOT NULL,
  cpf                   TEXT,               -- conferido no ato da assinatura
  registro_profissional TEXT,

  -- Hash do documento quando o link foi gerado. Se o conteúdo mudar depois,
  -- o convite é recusado: a pessoa não pode assinar algo diferente do que
  -- lhe foi enviado.
  hash_documento        TEXT NOT NULL,

  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por_email      TEXT,
  expira_em             TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),

  usado_em              TIMESTAMPTZ,
  assinatura_id         UUID REFERENCES caritas_assinaturas(id) ON DELETE SET NULL,

  cancelado             BOOLEAN NOT NULL DEFAULT false,

  -- Proteção contra tentativa de adivinhar o CPF
  tentativas            INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_convite_entidade
  ON caritas_convites_assinatura(entidade, entidade_id);

CREATE INDEX IF NOT EXISTS idx_convite_token
  ON caritas_convites_assinatura(token);

-- Um convite ativo por papel e documento
CREATE UNIQUE INDEX IF NOT EXISTS idx_convite_papel_ativo
  ON caritas_convites_assinatura(entidade, entidade_id, papel)
  WHERE cancelado = false AND usado_em IS NULL;

ALTER TABLE caritas_convites_assinatura ENABLE ROW LEVEL SECURITY;

-- Só quem tem acesso ao convênio enxerga os convites pelo app.
-- A página pública de assinatura usa a service_role e busca pelo token.
DROP POLICY IF EXISTS "convites_acesso" ON caritas_convites_assinatura;
CREATE POLICY "convites_acesso" ON caritas_convites_assinatura FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

-- Conferência
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'caritas_convites_assinatura'
ORDER BY ordinal_position;
