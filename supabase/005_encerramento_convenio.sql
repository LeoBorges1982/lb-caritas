-- =====================================================================
-- 005_encerramento_convenio.sql
-- Encerramento formal de convênio + saldo a manter + devolução + prorrogação
-- =====================================================================

-- 1) Novos campos no convênio
alter table caritas_convenios
  add column if not exists saldo_anterior_finalidade text,
  add column if not exists saldo_anterior_rubricas_permitidas text[],
  add column if not exists convenio_origem_id uuid references caritas_convenios(id) on delete set null,
  add column if not exists encerrado_em date,
  add column if not exists encerrado_por uuid references auth.users(id);

create index if not exists caritas_convenios_origem_idx on caritas_convenios(convenio_origem_id);

-- 2) Tabela de encerramentos (snapshot do que foi decidido)
create table if not exists caritas_encerramentos (
  id                       uuid primary key default uuid_generate_v4(),
  convenio_id              uuid not null references caritas_convenios(id) on delete cascade,

  -- Saldos
  saldo_final_calculado    numeric(15,2) not null,
  valor_a_manter           numeric(15,2) not null default 0,
  valor_a_devolver         numeric(15,2) not null default 0,
  valor_glosado            numeric(15,2) not null default 0,

  finalidade_saldo         text,
  rubricas_permitidas      text[],

  -- Ofício do órgão
  oficio_numero            text,
  oficio_data              date,
  oficio_orgao             text,
  oficio_observacoes       text,

  -- Devolução (quando feita)
  devolucao_data           date,
  devolucao_comprovante    text,
  devolucao_lancamento_id  uuid references caritas_lancamentos(id) on delete set null,

  -- Continuidade
  convenio_sucessor_id     uuid references caritas_convenios(id) on delete set null,

  status                   text not null default 'pendente'
                           check (status in ('pendente','oficio_recebido','devolvido','renovado','finalizado')),

  observacoes              text,
  criado_em                timestamptz not null default now(),
  criado_por               uuid references auth.users(id),
  atualizado_em            timestamptz not null default now()
);

create index if not exists caritas_encerramentos_convenio_idx on caritas_encerramentos(convenio_id);
create index if not exists caritas_encerramentos_status_idx on caritas_encerramentos(status);

-- 3) View — saldo do encerramento (calcula automaticamente)
create or replace function caritas_calcular_encerramento(p_convenio_id uuid)
returns jsonb language plpgsql as $$
declare
  v_total_entradas numeric;
  v_total_saidas numeric;
  v_glosado numeric;
  v_saldo_final numeric;
  v_previstas numeric;
  v_realizadas numeric;
  v_executado_menor numeric;
begin
  -- Total executado realmente (pago, não cancelado)
  select coalesce(sum(case when tipo in ('repasse','rendimento','saldo_anterior') and status <> 'cancelado' then valor else 0 end), 0),
         coalesce(sum(case when tipo = 'despesa' and status not in ('cancelado','glosado') then valor else 0 end), 0),
         coalesce(sum(case when tipo = 'despesa' and status = 'glosado' then valor else 0 end), 0)
  into v_total_entradas, v_total_saidas, v_glosado
  from caritas_lancamentos
  where convenio_id = p_convenio_id;

  v_saldo_final := v_total_entradas - v_total_saidas;

  -- Despesas previstas vs realizadas
  select coalesce(sum(valor_previsto), 0) into v_previstas
  from caritas_categorias_despesa where convenio_id = p_convenio_id;

  v_realizadas := v_total_saidas;
  v_executado_menor := greatest(0, v_previstas - v_realizadas);

  return jsonb_build_object(
    'total_entradas', v_total_entradas,
    'total_saidas', v_total_saidas,
    'valor_glosado', v_glosado,
    'saldo_final', v_saldo_final,
    'despesas_previstas', v_previstas,
    'despesas_realizadas', v_realizadas,
    'executado_menor', v_executado_menor
  );
end; $$;
