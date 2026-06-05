-- =====================================================================
-- 007_contrapartida_osc.sql
-- Adiciona valor_pago_total ao lançamento — diferença vira contrapartida OSC
-- =====================================================================

alter table caritas_lancamentos
  add column if not exists valor_pago_total numeric(15,2);

comment on column caritas_lancamentos.valor_pago_total is
'Valor REAL pago pela OSC (que pode ser maior que o valor coberto pelo convênio). Se null = igual a valor (sem complemento OSC). Se > valor, a diferença é contrapartida/recursos próprios da OSC.';

-- Função auxiliar pra calcular o "Recursos OSC" agregado (linha C da receita SEMAS)
create or replace function caritas_total_recursos_osc(p_convenio_id uuid, p_inicio date, p_fim date)
returns numeric language sql as $$
  select coalesce(sum(coalesce(valor_pago_total, valor) - valor), 0)
  from caritas_lancamentos
  where convenio_id = p_convenio_id
    and tipo = 'despesa'
    and status not in ('cancelado','glosado')
    and data_lancamento between p_inicio and p_fim
    and valor_pago_total is not null
    and valor_pago_total > valor;
$$;
