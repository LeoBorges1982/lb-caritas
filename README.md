# LB Caritas

Sistema de gestão de convênios públicos (Lei 13.019/2014).
Cliente piloto: Cáritas Diocesana de Nova Iguaçu — Convênio 001/FMAS/2025 (SEMAS).

Stack: Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase · SSO Portal LB.

## Rodar local

```bash
npm install
cp .env.local.example .env.local
# preencher variáveis
npm run dev
```

App em http://localhost:3000 — sem cookie, redireciona para `/login`.

## Build Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -t lb-caritas .
```

## SSO

Mesmo padrão do lb-crm: JWT HMAC-SHA256 assinado com `PORTAL_SECRET`,
campo `sis="caritas"`. Cookie compartilhado `.leoborgescontador.com.br`.
