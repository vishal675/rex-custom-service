#!/usr/bin/env bash
# Runs the SQL security tests against the linked (UAT) database inside ONE transaction
# that is always rolled back — nothing is written.
#
#   supabase/scripts/test-db.sh                    # test the schema already on UAT
#   supabase/scripts/test-db.sh --with-migrations  # dry-run: apply all migrations + test, then roll back
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; source .env; set +a

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
{
  echo "begin;"
  if [ "${1:-}" = "--with-migrations" ]; then cat supabase/migrations/*.sql; fi
  cat supabase/tests/*.test.sql
  echo "rollback;"
} > "$tmp"

npx -y supabase@latest db query --remote --yes -f "$tmp"
