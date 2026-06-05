-- =====================================================================
-- Migração 008 — Plano de Trabalho + Provisionamento trabalhista
-- =====================================================================
-- ADAPTADA ao schema real:
--   - Tabela de rubricas: caritas_categorias_despesa (NÃO caritas_categorias)
--   - Tipos de lançamento: despesa, repasse, rendimento, devolucao, estorno
--   - Coluna data: data_lancamento (NÃO data)
--   - caritas_categorias_despesa JÁ tem valor_previsto (anual) por convênio
--     → só adiciono valor_mensal_previsto e tipo_acumulo
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- PASSO 1: tipo de rubrica + valor mensal (estende caritas_categorias_despesa)
-- ─────────────────────────────────────────────────────────────────────
alter table caritas_categorias_despesa
  add column if not exists tipo_acumulo text
    check (tipo_acumulo in ('corrente', 'provisionamento'))
    default 'corrente',
  add column if not exists valor_mensal_previsto numeric(15,2) default 0,
  add column if not exists meses_cronograma int default 12;

comment on column caritas_categorias_despesa.tipo_acumulo is
  'corrente: teto mensal estrito (salário, gêneros, VT). '
  'provisionamento: acumula mensalmente, gasto eventual (rescisão, férias, 13º).';

-- Marca rubricas de provisionamento (regra: código começa com 1.3 ou nome contém provisão/rescisão)
update caritas_categorias_despesa
   set tipo_acumulo = 'provisionamento'
 where lower(nome) like '%provision%'
    or lower(nome) like '%rescis%'
    or codigo like '1.3%';

-- ─────────────────────────────────────────────────────────────────────
-- PASSO 2: Saldo anterior carimbado por rubrica no convênio
-- ─────────────────────────────────────────────────────────────────────
alter table caritas_convenios
  add column if not exists saldo_anterior_categoria_id uuid
    references caritas_categorias_despesa(id),
  add column if not exists saldo_anterior_oficio       text,
  add column if not exists saldo_anterior_convenio     text;

comment on column caritas_convenios.saldo_anterior_categoria_id is
  'Rubrica destino do saldo anterior (geralmente Provisionamento 1.3).';
comment on column caritas_convenios.saldo_anterior_oficio is
  'Ofício que autorizou a manutenção do saldo (ex: 79/FMAS/2026 §8).';
comment on column caritas_convenios.saldo_anterior_convenio is
  'Convênio anterior de origem do saldo (ex: 001/FMAS/2025).';

-- ─────────────────────────────────────────────────────────────────────
-- PASSO 3: Saldo de provisionamento acumulado
-- ─────────────────────────────────────────────────────────────────────
create or replace function caritas_saldo_provisionamento(
  p_convenio_id  uuid,
  p_categoria_id uuid,
  p_ate_data     date default current_date
) returns numeric
language plpgsql
stable
as $$
declare
  v_saldo_anterior      numeric(15,2) := 0;
  v_valor_mensal        numeric(15,2) := 0;
  v_meses               int           := 0;
  v_total_pago          numeric(15,2) := 0;
  v_data_inicio         date;
  v_tipo                text;
begin
  select tipo_acumulo, coalesce(valor_mensal_previsto, 0)
    into v_tipo, v_valor_mensal
    from caritas_categorias_despesa where id = p_categoria_id;

  if v_tipo <> 'provisionamento' then
    return null;
  end if;

  -- Saldo anterior se a rubrica bate
  select coalesce(saldo_anterior, 0), data_inicio
    into v_saldo_anterior, v_data_inicio
    from caritas_convenios
   where id = p_convenio_id
     and saldo_anterior_categoria_id = p_categoria_id;

  if v_saldo_anterior is null then
    v_saldo_anterior := 0;
    select data_inicio into v_data_inicio
      from caritas_convenios where id = p_convenio_id;
  end if;

  -- Meses transcorridos
  if v_data_inicio is not null then
    v_meses := greatest(0,
      (extract(year  from age(p_ate_data, v_data_inicio))::int * 12) +
       extract(month from age(p_ate_data, v_data_inicio))::int + 1
    );
  end if;

  -- Total já pago nessa rubrica
  select coalesce(sum(valor), 0) into v_total_pago
    from caritas_lancamentos
   where convenio_id    = p_convenio_id
     and categoria_id   = p_categoria_id
     and tipo           = 'despesa'
     and data_lancamento <= p_ate_data;

  return v_saldo_anterior + (v_valor_mensal * v_meses) - v_total_pago;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- PASSO 4: Validação de teto no lançamento
-- ─────────────────────────────────────────────────────────────────────
create or replace function caritas_validar_lancamento(
  p_convenio_id   uuid,
  p_categoria_id  uuid,
  p_valor         numeric,
  p_data          date,
  p_lancamento_id uuid default null
) returns table (
  ok         boolean,
  motivo     text,
  saldo_disp numeric,
  teto       numeric
)
language plpgsql
stable
as $$
declare
  v_tipo            text;
  v_valor_mensal    numeric(15,2);
  v_valor_anual     numeric(15,2);
  v_total_mes       numeric(15,2);
  v_saldo_prov      numeric(15,2);
  v_ano             int;
  v_mes             int;
begin
  v_ano := extract(year  from p_data);
  v_mes := extract(month from p_data);

  select tipo_acumulo, coalesce(valor_mensal_previsto, 0), coalesce(valor_previsto, 0)
    into v_tipo, v_valor_mensal, v_valor_anual
    from caritas_categorias_despesa where id = p_categoria_id;

  -- Sem teto cadastrado → permite
  if v_valor_mensal = 0 and v_valor_anual = 0 then
    return query select true, 'Sem teto cadastrado'::text, null::numeric, null::numeric;
    return;
  end if;

  if v_tipo = 'provisionamento' then
    v_saldo_prov := caritas_saldo_provisionamento(p_convenio_id, p_categoria_id, p_data);
    if v_saldo_prov < p_valor then
      return query select false,
        format('Excede saldo de provisionamento. Disponível: R$ %s',
               to_char(v_saldo_prov, 'FM999G999G990D00')),
        v_saldo_prov, v_valor_anual;
    else
      return query select true, 'OK (provisionamento)'::text, v_saldo_prov, v_valor_anual;
    end if;
    return;
  end if;

  -- Corrente: teto mensal
  select coalesce(sum(valor), 0) into v_total_mes
    from caritas_lancamentos
   where convenio_id    = p_convenio_id
     and categoria_id   = p_categoria_id
     and tipo           = 'despesa'
     and extract(year  from data_lancamento) = v_ano
     and extract(month from data_lancamento) = v_mes
     and (p_lancamento_id is null or id <> p_lancamento_id);

  if (v_total_mes + p_valor) > v_valor_mensal then
    return query select false,
      format('Excede teto mensal R$ %s. Já gasto no mês: R$ %s',
             to_char(v_valor_mensal, 'FM999G999G990D00'),
             to_char(v_total_mes,    'FM999G999G990D00')),
      (v_valor_mensal - v_total_mes), v_valor_mensal;
  else
    return query select true, 'OK'::text,
      (v_valor_mensal - v_total_mes - p_valor), v_valor_mensal;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- PASSO 5: View — execução orçamentária por rubrica
-- ─────────────────────────────────────────────────────────────────────
drop view if exists caritas_v_execucao_orcamentaria;
create view caritas_v_execucao_orcamentaria as
select
  c.convenio_id,
  c.id                                              as categoria_id,
  c.codigo                                          as rubrica_codigo,
  c.nome                                            as rubrica_nome,
  c.tipo_acumulo,
  c.valor_mensal_previsto,
  c.valor_previsto                                  as valor_anual_previsto,
  coalesce(l.total_executado, 0)                    as total_executado,
  c.valor_previsto - coalesce(l.total_executado, 0) as saldo_disponivel,
  case when c.valor_previsto > 0 then
    round((coalesce(l.total_executado, 0) / c.valor_previsto) * 100, 2)
  else 0 end                                        as pct_executado
from caritas_categorias_despesa c
left join lateral (
  select sum(valor) as total_executado
  from caritas_lancamentos
  where convenio_id  = c.convenio_id
    and categoria_id = c.id
    and tipo         = 'despesa'
) l on true
where c.ativo = true;

-- ─────────────────────────────────────────────────────────────────────
-- PASSO 6: ANEXO I do encerramento (formato SEMAS/FMAS)
-- ─────────────────────────────────────────────────────────────────────
create or replace function caritas_gerar_anexo_i(p_convenio_id uuid)
returns table (
  rubrica_codigo          text,
  rubrica_nome            text,
  tipo_acumulo            text,
  despesas_previstas      numeric,
  despesas_realizadas     numeric,
  exec_a_maior            numeric,
  exec_a_menor            numeric,
  saldo_remanescente      numeric,
  saldo_provisao          numeric,
  glosa                   numeric,
  valor_a_devolver        numeric,
  valor_autorizado_manter numeric
)
language sql
stable
as $$
  with exec_calc as (
    select
      c.id,
      c.codigo,
      c.nome,
      c.tipo_acumulo,
      coalesce(c.valor_previsto, 0)                            as previsto,
      coalesce(l.total, 0)                                     as realizado,
      coalesce(l.total_glosa, 0)                               as glosa_total
    from caritas_categorias_despesa c
    left join lateral (
      select
        sum(valor) filter (where tipo = 'despesa') as total,
        sum(valor) filter (where tipo = 'estorno') as total_glosa
      from caritas_lancamentos
      where convenio_id  = p_convenio_id
        and categoria_id = c.id
    ) l on true
    where c.convenio_id = p_convenio_id
      and c.ativo       = true
  )
  select
    codigo,
    nome,
    tipo_acumulo,
    previsto                                                   as despesas_previstas,
    realizado                                                  as despesas_realizadas,
    greatest(realizado - previsto, 0)                          as exec_a_maior,
    greatest(previsto  - realizado, 0)                         as exec_a_menor,
    case when tipo_acumulo = 'corrente'
         then greatest(previsto - realizado, 0) else 0 end     as saldo_remanescente,
    case when tipo_acumulo = 'provisionamento'
         then greatest(previsto - realizado, 0) else 0 end     as saldo_provisao,
    glosa_total                                                as glosa,
    case when tipo_acumulo = 'corrente'
         then greatest(previsto - realizado, 0) + glosa_total
         else glosa_total end                                  as valor_a_devolver,
    case when tipo_acumulo = 'provisionamento'
         then greatest(previsto - realizado, 0) else 0 end     as valor_autorizado_manter
  from exec_calc
  order by codigo;
$$;

comment on function caritas_gerar_anexo_i is
  'Gera o quadro ANEXO I do encerramento no formato SEMAS/FMAS.';

-- =====================================================================
-- FIM DA MIGRAÇÃO 008
-- =====================================================================
