-- ============================================================================
-- Assinatura eletrônica avançada (Lei 14.063/2020, art. 4º, II)
-- ============================================================================
-- Modelo: a assinatura recai sobre o HASH DO CONTEÚDO consolidado da prestação
-- (não sobre os bytes do PDF). Se qualquer lançamento do período for alterado
-- depois de assinado, o hash recalculado diverge e o sistema sinaliza que o
-- documento foi modificado após a assinatura.
--
-- Comprovação de autoria: usuário autenticado via SSO do Portal LB.
-- Comprovação de integridade: SHA-256 do conteúdo + trilha de auditoria.
-- Verificação pública: /verificar/<id da prestação> (QR code no documento).
-- ============================================================================

CREATE TABLE IF NOT EXISTS caritas_assinaturas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convenio_id           UUID REFERENCES caritas_convenios(id) ON DELETE CASCADE,
  entidade              TEXT NOT NULL DEFAULT 'prestacao'
                        CHECK (entidade IN ('prestacao','balancete')),
  entidade_id           UUID NOT NULL,

  -- Quem assina (papel no documento oficial)
  papel                 TEXT NOT NULL
                        CHECK (papel IN ('gestor_osc','elaborador','responsavel_legal','contabilista')),
  nome                  TEXT NOT NULL,
  cpf                   TEXT,
  registro_profissional TEXT,               -- CRC, no caso do contabilista

  -- Prova de integridade
  hash_documento        TEXT NOT NULL,      -- SHA-256 do conteúdo no momento da assinatura
  algoritmo             TEXT NOT NULL DEFAULT 'SHA-256',

  -- Trilha de auditoria
  assinado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  assinado_por_id       UUID REFERENCES auth.users(id),
  assinado_por_email    TEXT,
  ip                    TEXT,
  user_agent            TEXT,

  -- Revogação (permite refazer a assinatura se o documento mudar)
  revogada              BOOLEAN NOT NULL DEFAULT false,
  revogada_em           TIMESTAMPTZ,
  revogada_motivo       TEXT,

  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assin_entidade ON caritas_assinaturas(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_assin_convenio ON caritas_assinaturas(convenio_id);

-- Um papel só pode ter uma assinatura ativa por documento
CREATE UNIQUE INDEX IF NOT EXISTS idx_assin_papel_unico
  ON caritas_assinaturas(entidade, entidade_id, papel)
  WHERE revogada = false;

ALTER TABLE caritas_assinaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assinaturas_acesso" ON caritas_assinaturas;
CREATE POLICY "assinaturas_acesso" ON caritas_assinaturas FOR ALL TO authenticated
  USING (caritas_tem_acesso_convenio(convenio_id))
  WITH CHECK (caritas_tem_acesso_convenio(convenio_id));

-- Conferência
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'caritas_assinaturas'
ORDER BY ordinal_position;
