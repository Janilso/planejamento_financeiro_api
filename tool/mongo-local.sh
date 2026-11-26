#!/usr/bin/env bash
# MongoDB local para desenvolvimento (nada de Atlas).
#
# Uso: tool/mongo-local.sh <comando>   (ou npm run db:local -- <comando>)
#   start    sobe o MongoDB em segundo plano (padrão; não faz nada se já estiver rodando)
#   stop     desliga
#   status   diz se está rodando
#
# Variáveis opcionais:
#   MONGO_LOCAL_DIR   pasta dos dados (padrão: ~/mongo-dev)
#   MONGO_LOCAL_PORT  porta (padrão: 27017)
#   MONGOD_BIN        caminho do mongod (padrão: o do PATH ou o baixado pelos testes)
#
# No .env: MONGO_URI=mongodb://127.0.0.1:27017/planejamento_dev
set -euo pipefail

DIR="${MONGO_LOCAL_DIR:-$HOME/mongo-dev}"
PORT="${MONGO_LOCAL_PORT:-27017}"

achar_mongod() {
  if [ -n "${MONGOD_BIN:-}" ]; then echo "$MONGOD_BIN"; return; fi
  if command -v mongod >/dev/null 2>&1; then command -v mongod; return; fi
  # Binário que o mongodb-memory-server baixa ao rodar os testes.
  local cache
  cache=$(ls -1 "$HOME"/.cache/mongodb-binaries/mongod-* 2>/dev/null | grep -v '\.md5$' | sort -V | tail -1 || true)
  if [ -n "$cache" ]; then echo "$cache"; return; fi
  echo "Erro: mongod não encontrado. Rode 'npm test' uma vez (baixa o binário) ou defina MONGOD_BIN." >&2
  exit 1
}

rodando() {
  pgrep -f -- "--dbpath $DIR" >/dev/null 2>&1
}

case "${1:-start}" in
  start)
    if rodando; then
      echo "MongoDB já está rodando (dados em $DIR, porta $PORT)."
      exit 0
    fi
    mkdir -p "$DIR"
    "$(achar_mongod)" --dbpath "$DIR" --port "$PORT" --bind_ip 127.0.0.1 \
      --fork --logpath "$DIR/mongod.log" >/dev/null
    echo "MongoDB rodando em mongodb://127.0.0.1:$PORT (dados em $DIR)."
    ;;
  stop)
    if ! rodando; then echo "MongoDB já está parado."; exit 0; fi
    pkill -f -- "--dbpath $DIR"
    echo "MongoDB desligado."
    ;;
  status)
    if rodando; then echo "Rodando (porta $PORT, dados em $DIR)."; else echo "Parado."; fi
    ;;
  *)
    sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//' >&2
    exit 2
    ;;
esac
