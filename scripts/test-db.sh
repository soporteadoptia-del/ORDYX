#!/usr/bin/env bash
# Ejecuta las migraciones y las pruebas RLS contra un PostgreSQL local efímero.
# Requisitos: binarios de PostgreSQL >= 15 (initdb, pg_ctl, psql) en el PATH o en /usr/lib/postgresql/*/bin.
# Uso: pnpm test:db
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  # PostgreSQL no puede ejecutarse como root.
  id ordyxpg >/dev/null 2>&1 || useradd -M -s /bin/false ordyxpg
  chown -R ordyxpg "$WORK"
  RUN_AS="runuser -u ordyxpg --"
fi

cleanup() {
  $RUN_AS pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

$RUN_AS initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null
$RUN_AS pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" -w start >/dev/null

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d postgres)

echo "▶ Stub de Supabase"
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "▶ Migración $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
for f in "$ROOT"/supabase/tests/[1-9]*.sql; do
  echo "▶ Pruebas $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "✔ Migraciones y pruebas de base de datos superadas"
