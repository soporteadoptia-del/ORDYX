#!/usr/bin/env bash
# Pruebas de humo contra la API REAL de Supabase como cliente anónimo (solo usa la clave publicable).
# Uso: SUPABASE_URL=https://xxx.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_... bash scripts/smoke-api.sh
set -uo pipefail
: "${SUPABASE_URL:?}"; : "${SUPABASE_PUBLISHABLE_KEY:?}"
H=(-H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json")
fail=0
OUT=$(mktemp); trap 'rm -f "$OUT"' EXIT
check() { # descripción, código esperado (regex), método, ruta, [cuerpo]
  local desc=$1 expect=$2 method=$3 path=$4 body=${5:-}
  local code
  code=$(curl -s -o "$OUT" -w '%{http_code}' -X "$method" "${H[@]}" ${body:+-d "$body"} "$SUPABASE_URL$path")
  if [[ $code =~ ^($expect)$ ]]; then echo "ok   [$code] $desc"; else echo "FALLO [$code] $desc → $(head -c 200 "$OUT")"; fail=1; fi
}
check "anon lee el catálogo publicado" 200 GET "/rest/v1/tracks?select=id,title&limit=1"
check "anon lee géneros" 200 GET "/rest/v1/genres?select=slug"
check "anon lee configuración pública" 200 GET "/rest/v1/app_config?select=key"
check "anon lee versiones publicadas" 200 GET "/rest/v1/current_app_versions?select=platform,version"
check "anon NO lee ajustes de usuarios" "401|403" GET "/rest/v1/user_settings?select=*"
check "anon NO lee reclamaciones" "401|403" GET "/rest/v1/rights_claims?select=*"
check "anon NO lee auditoría" "401|403" GET "/rest/v1/admin_audit_logs?select=*"
check "anon NO lee escuchas" "401|403" GET "/rest/v1/play_sessions?select=*"
check "anon NO inserta canciones" "401|403" POST "/rest/v1/tracks" '{"title":"x"}'
check "anon NO se concede roles" "401|403" POST "/rest/v1/user_roles" '{"user_id":"00000000-0000-0000-0000-000000000000","role":"admin"}'
check "anon NO publica versiones" "401|403" POST "/rest/v1/app_versions" '{"platform":"android"}'
check "anon NO registra reproducciones" "401|403|404" POST "/rest/v1/rpc/start_play" '{"p_track_id":"00000000-0000-0000-0000-000000000000"}'
check "anon NO ejecuta bootstrap_first_admin" "401|403|404" POST "/rest/v1/rpc/bootstrap_first_admin" '{"p_email":"a@b.c"}'
check "anon NO usa funciones admin" "400|401|403|404" POST "/rest/v1/rpc/admin_stats" '{}'
check "anon busca en el catálogo" 200 POST "/rest/v1/rpc/search_catalog" '{"p_query":"demo"}'
check "auxiliares de RLS no expuestas (is_blocked_between)" "404" POST "/rest/v1/rpc/is_blocked_between" '{"a":"00000000-0000-0000-0000-000000000000","b":"00000000-0000-0000-0000-000000000001"}'
check "auxiliares de RLS no expuestas (is_admin)" "404" POST "/rest/v1/rpc/is_admin" '{}'
check "audio privado: no hay URL pública" "400|401|403|404" GET "/storage/v1/object/public/audio/x/y/original.mp3"
exit $fail
