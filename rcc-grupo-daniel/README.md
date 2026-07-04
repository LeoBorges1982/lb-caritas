# RCC Grupo Daniel

Aplicativo de gestão do grupo de oração **RCC Grupo Daniel** (Renovação Carismática Católica):
membros, frequência, finanças, doações via PIX, agenda, mural de avisos, pedidos de oração e
relatórios — substituindo planilhas e cadernos.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth) ·
PWA mobile-first (instalável em Android e iOS pelo navegador, "Adicionar à tela inicial").

> O prompt original sugeria React Native/Expo e permitia adaptação de stack. Optou-se por uma
> PWA Next.js seguindo o padrão dos demais sistemas LB (lb-caritas, lb-crm): mesma infra de
> deploy (Docker), manutenção única e funcionamento idêntico em Android/iOS.

## Funcionalidades (MVP)

| Módulo | Descrição |
|---|---|
| Autenticação | Login e-mail/senha (Supabase Auth), cadastro com aprovação do admin, recuperação de senha |
| Perfis | Coordenador (admin), Tesoureiro, Líder, Membro — rotas e ações protegidas por perfil |
| Membros | CRUD completo, filtros, aniversariantes, importação CSV com validação de duplicidade, cartão de membro digital com QR Code |
| Financeiro | Receitas, despesas, fornecedores, saldo em caixa (confirmadas − pagas), baixa de pendências, auditoria |
| PIX | Contribuição com BR Code EMV **real** (QR + copia-e-cola) usando a chave estática do grupo; `PixPaymentService` preparado para gateway com webhook (`/api/webhooks/pix`); baixa manual pelo tesoureiro; confirmação gera receita automaticamente |
| Relatórios | Prestação de contas por período, gráficos de entradas/saídas e por categoria, evolução 6 meses, export CSV, impressão A4 |
| Frequência | Reuniões, registro rápido presente/falta/justificado, visitantes, média de participação |
| Agenda | Eventos com tipo, local, horário; visão por mês; próximos eventos no dashboard |
| Mural | Avisos com tipo, fixação, agendamento, expiração e segmentação por público |
| Oração | Pedidos públicos/privados com moderação configurável |

## Rodar local

```bash
cd rcc-grupo-daniel
npm install
cp .env.local.example .env.local   # preencher variáveis
npm run dev                        # http://localhost:3000
```

### Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) e copie URL/keys para o `.env.local`.
2. No SQL Editor, execute na ordem:
   - `supabase/001_schema_rcc.sql` (tabelas, triggers, RLS)
   - `supabase/002_seed_demo.sql` (dados fictícios de teste — opcional)
3. Em **Authentication → Providers**, deixe Email habilitado. Para testes, desative
   "Confirm email" ou configure SMTP.
4. Crie sua conta pela tela **/cadastro** do app e promova-a a administrador:

```sql
UPDATE rcc_users SET role='admin', status='ativo' WHERE email='seu@email.com';
```

Os demais usuários são aprovados dentro do app em **Usuários e permissões**.

### Configurar o PIX

Em **Configurações** (perfil admin), informe a chave PIX do grupo, nome e cidade do recebedor.
O app gera cobranças estáticas (BR Code padrão Bacen com txid) — o pagamento cai direto na
conta do grupo e o tesoureiro dá baixa em **Recebimentos PIX**.

Para confirmação automática, integre um gateway (Efí, Mercado Pago, Asaas...):
implemente um `PixProvider` em `src/lib/pix.ts` e aponte o webhook do gateway para
`POST /api/webhooks/pix` com o header `X-Webhook-Secret` = `PIX_WEBHOOK_SECRET`.

## Build Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -t rcc-grupo-daniel .
```

## Segurança e LGPD

- Autenticação obrigatória (middleware) e controle de acesso por perfil na camada de aplicação.
- RLS habilitado com política deny-all — o banco só é acessado via service role no servidor.
- Membro não vê dados financeiros de outros; tesoureiro não acessa permissões.
- Aceite de termos registrado no cadastro; logs de auditoria em `rcc_audit_logs`.
- Inativação em vez de exclusão para membros e usuários.

## Regras de negócio principais

- Saldo em caixa = receitas **confirmadas** − despesas **pagas** (pendentes ficam de fora).
- PIX confirmado (baixa manual ou webhook) gera automaticamente a receita correspondente.
- Só admin altera perfis de acesso; só admin/tesoureiro lançam movimentações.
- Líder registra frequência apenas das células/ministérios autorizados (`led_groups`).
- Membro edita apenas os próprios dados de contato.

## Próximos passos sugeridos

1. Integração PIX real com gateway (webhook já preparado).
2. Push notifications (o manifest PWA já existe; falta service worker + FCM/OneSignal).
3. Upload de foto de perfil e comprovantes (Supabase Storage).
4. Confirmação de presença em eventos pelos membros.
5. Relatório pastoral por célula e exportação PDF nativa.
6. Gestão de patrimônio (Won't Have desta versão).
