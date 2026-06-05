-- =====================================================================
-- 004_saldo_anterior_e_tetos.sql
-- Adiciona saldo_anterior + tolerância de teto + função de validação
-- =====================================================================

-- 1) saldo_anterior no convênio (renovações trazem saldo remanescente)
alter table caritas_convenios
  add column if not exists saldo_anterior numeric(15,2) not null default 0,
  add column if not exists saldo_anterior_origem text;
  -- origem: ex "Convênio 001/FMAS/2024 — saldo remanescente em 31/12/2024"

-- 2) Novo tipo de lançamento "saldo_anterior" pra registrar entrada inicial
alter table caritas_lancamentos drop constraint if exists caritas_lancamentos_tipo_check;
alter table caritas_lancamentos add constraint caritas_lancamentos_tipo_check
  check (tipo in (
    'repasse',
    'rendimento',
    'devolucao',
    'despesa',
    'estorno',
    'saldo_anterior'  -- saldo trazido de período anterior
  ));

-- 3) Categoria de despesa ganha campo de tolerância (% de remanejamento permitido)
alter table caritas_categorias_despesa
  add column if not exists tolerancia_pct numeric(5,2) not null default 0;
-- ex: 10 = pode estourar em até 10% antes de bloquear; padrão 0 = teto rígido

-- 4) Função que valida se um lançamento de despesa cabe na rubrica
create or replace function caritas_validar_teto_rubrica(
  p_categoria_id uuid,
  p_valor numeric,
  p_lancamento_id uuid default null
)
returns jsonb language plpgsql as $$
declare
  v_previsto numeric;
  v_tolerancia numeric;
  v_realizado numeric;
  v_teto numeric;
  v_disponivel numeric;
  v_nome text;
begin
  -- Sem categoria não valida (lançamento livre)
  if p_categoria_id is null then
    return jsonb_build_object('ok', true, 'motivo', 'sem categoria');
  end if;

  select valor_previsto, coalesce(tolerancia_pct, 0), nome
    into v_previsto, v_tolerancia, v_nome
  from caritas_categorias_despesa
  where id = p_categoria_id;

  if v_previsto is null then
    return jsonb_build_object('ok', true, 'motivo', 'categoria não encontrada');
  end if;

  -- Soma realizado atual (exclui este lançamento se for edição)
  select coalesce(sum(valor), 0) into v_realizado
  from caritas_lancamentos
  where categoria_id = p_categoria_id
    and tipo = 'despesa'
    and status not in ('cancelado', 'glosado')
    and (p_lancamento_id is null or id <> p_lancamento_id);

  v_teto := v_previsto * (1 + v_tolerancia / 100.0);
  v_disponivel := v_teto - v_realizado;

  if p_valor > v_disponivel then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Estoura o teto da rubrica',
      'rubrica', v_nome,
      'previsto', v_previsto,
      'tolerancia_pct', v_tolerancia,
      'teto_com_tolerancia', v_teto,
      'realizado', v_realizado,
      'disponivel', v_disponivel,
      'tentando_lancar', p_valor,
      'excedente', p_valor - v_disponivel
    );
  end if;

  -- Avisa quando passa de 80% (sem bloquear)
  declare
    v_pct_apos numeric := ((v_realizado + p_valor) / v_previsto) * 100;
  begin
    if v_pct_apos >= 80 then
      return jsonb_build_object(
        'ok', true,
        'alerta', true,
        'rubrica', v_nome,
        'pct_apos', v_pct_apos,
        'mensagem', 'Atenção: rubrica ficará em ' || round(v_pct_apos, 1) || '% do previsto'
      );
    end if;
  end;

  return jsonb_build_object('ok', true);
end;
$$;

-- 5) Função pra calcular saldo disponível total do convênio
create or replace function caritas_saldo_disponivel(p_convenio_id uuid)
returns jsonb language plpgsql as $$
declare
  v_saldo_anterior numeric;
  v_repasses numeric;
  v_rendimentos numeric;
  v_despesas numeric;
  v_devolucoes numeric;
  v_total_entradas numeric;
  v_total_saidas numeric;
  v_saldo numeric;
begin
  select coalesce(saldo_anterior, 0) into v_saldo_anterior
  from caritas_convenios where id = p_convenio_id;

  select
    coalesce(sum(case when tipo = 'repasse' then valor else 0 end), 0),
    coalesce(sum(case when tipo = 'rendimento' then valor else 0 end), 0),
    coalesce(sum(case when tipo = 'despesa' then valor else 0 end), 0),
    coalesce(sum(case when tipo = 'devolucao' then valor else 0 end), 0)
  into v_repasses, v_rendimentos, v_despesas, v_devolucoes
  from caritas_lancamentos
  where convenio_id = p_convenio_id
    and status not in ('cancelado', 'glosado');

  v_total_entradas := v_saldo_anterior + v_repasses + v_rendimentos;
  v_total_saidas := v_despesas + v_devolucoes;
  v_saldo := v_total_entradas - v_total_saidas;

  return jsonb_build_object(
    'saldo_anterior', v_saldo_anterior,
    'repasses', v_repasses,
    'rendimentos', v_rendimentos,
    'despesas', v_despesas,
    'devolucoes', v_devolucoes,
    'total_entradas', v_total_entradas,
    'total_saidas', v_total_saidas,
    'saldo', v_saldo
  );
end;
$$;

-- 6) Atualiza view caritas_v_saldo_convenio pra incluir saldo_anterior
create or replace view caritas_v_saldo_convenio as
select
  c.id as convenio_id,
  c.numero,
  c.valor_total,
  c.saldo_anterior,
  c.saldo_anterior_origem,
  c.saldo_anterior
    + coalesce(sum(case when l.tipo in ('repasse','rendimento') and l.status <> 'cancelado' then l.valor else 0 end), 0) as total_entradas,
  coalesce(sum(case when l.tipo = 'despesa' and l.status not in ('cancelado','glosado') then l.valor else 0 end), 0) as total_saidas,
  c.saldo_anterior
    + coalesce(sum(case when l.tipo in ('repasse','rendimento') and l.status <> 'cancelado' then l.valor else 0 end), 0)
    - coalesce(sum(case when l.tipo = 'despesa' and l.status not in ('cancelado','glosado') then l.valor else 0 end), 0) as saldo_atual
from caritas_convenios c
left join caritas_lancamentos l on l.convenio_id = c.id
group by c.id, c.numero, c.valor_total, c.saldo_anterior, c.saldo_anterior_origem;
