#!/usr/bin/env bash
#
# Deploy do lb-caritas na VPS.
#
#   cd /opt/lb-caritas && git pull && bash deploy.sh
#
# Evita ter que colar comando gigante no terminal do painel (os marcadores
# de bracketed paste, ^[[200~, entram junto e o bash nao reconhece o comando).
#
set -e

APP_DIR="/opt/lb-caritas"
IMAGE="lb-caritas:latest"
SERVICE="lb-caritas_app"

cd "$APP_DIR"

echo "==> Atualizando codigo"
# NAO usar "git pull": diferenca de fim de linha (CRLF/LF) faz o git ver todo
# arquivo como modificado e o pull aborta com "You have unstaged changes".
# O servidor e alvo de deploy, nao lugar de editar codigo: espelha o remoto.
git fetch origin

if ! git diff --quiet || ! git diff --cached --quiet; then
  BACKUP="/root/lb-caritas-descartado-$(git rev-parse --short HEAD).patch"
  git diff HEAD > "$BACKUP" || true
  echo "    ATENCAO: havia alteracoes locais. Salvas em $BACKUP antes de descartar."
fi

git reset --hard origin/main

echo "==> Carregando variaveis do .env"
if [ ! -f .env ]; then
  echo "ERRO: $APP_DIR/.env nao encontrado." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. ./.env
set +a

# As NEXT_PUBLIC_* sao embutidas no bundle do cliente em tempo de BUILD.
# Se chegarem vazias o app compila, sobe e so quebra no navegador.
for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "ERRO: $var vazia ou ausente no .env — o build sairia quebrado." >&2
    exit 1
  fi
done

echo "==> Build da imagem"
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t "$IMAGE" .

echo "==> Atualizando o service"
docker service update --image "$IMAGE" --force "$SERVICE"

echo
echo "==> Deploy concluido: $(git log --oneline -1)"
