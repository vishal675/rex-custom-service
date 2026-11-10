#!/usr/bin/env bash
# Runs the SQL security tests against the linked (UAT) database inside ONE transaction
# that is always rolled back — nothing is written.
#
#   supabase/scripts/test-db.sh                  # test the schema already on UAT
#   supabase/scripts/test-db.sh --with-pending   # dry-run: apply not-yet-pushed migrations + test, then roll back
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; source .env; set +a

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

pending=()
if [ "${1:-}" = "--with-pending" ]; then
  applied=$(npx -y supabase@latest db query --remote --read-only --output-format json \
    "select coalesce(string_agg(version, ' '), '') as v from supabase_migrations.schema_migrations" |
    python3 -c "import json,sys; print(json.load(sys.stdin)['rows'][0]['v'])")
  for f in supabase/migrations/*.sql; do
    v="$(basename "$f" | cut -d_ -f1)"
    [[ " $applied " == *" $v "* ]] || pending+=("$f")
  done
  echo "Dry-running ${#pending[@]} pending migration(s): ${pending[*]:-none}" >&2
fi

{
  echo "begin;"
  for f in ${pending[@]+"${pending[@]}"}; do cat "$f"; done
  cat supabase/tests/*.test.sql
  echo "rollback;"
} > "$tmp"

npx -y supabase@latest db query --remote --yes -f "$tmp"
