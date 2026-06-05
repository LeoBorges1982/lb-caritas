-- =====================================================================
-- 006_reembolsos_completo.sql
-- Completa a tabela caritas_reembolsos com os campos esperados pelo código
-- =====================================================================

alter table caritas_reembolsos
  add column if not exists categoria_id uuid references caritas_categorias_despesa(id) on delete set null,
  add column if not exists meta_id uuid references caritas_metas(id) on delete set null,
  add column if not exists solicitante_nome text,
  add column if not exists solicitante_cpf text,
  add column if not exists descricao text,
  add column if not exists data_despesa date,
  add column if not exists valor numeric(15,2),
  add column if not exists comprovante_numero text,
  add column if not exists status text default 'solicitado'
    check (status in ('solicitado','aprovado','pago','rejeitado')),
  add column if not exists motivo_rejeicao text,
  add column if not exists aprovado_em timestamptz,
  add column if not exists pago_em timestamptz;

-- Migra dados antigos (se houver) do schema legado pro novo
update caritas_reembolsos
set valor = coalesce(valor, valor_total),
    data_despesa = coalesce(data_despesa, data),
    descricao = coalesce(descricao, observacoes, 'Reembolso'),
    solicitante_nome = coalesce(solicitante_nome, 'Não informado'),
    status = coalesce(status, 'solicitado')
where valor is null or data_despesa is null or descricao is null or solicitante_nome is null or status is null;

-- Garante NOT NULL nos campos críticos
alter table caritas_reembolsos
  alter column solicitante_nome set not null,
  alter column descricao set not null,
  alter column data_despesa set not null,
  alter column valor set not null,
  alter column status set not null;

create index if not exists caritas_reembolsos_status_idx on caritas_reembolsos(status);
create index if not exists caritas_reembolsos_convenio_idx on caritas_reembolsos(convenio_id);
