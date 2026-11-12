#!/usr/bin/env bash
# Deploys the Edge Functions to the linked project (UAT) and wires up push dispatch.
# Safe to re-run. Review before running:
#   1. Generates a random shared secret (never printed, never written to disk or git).
#   2. Stores it as the Edge Function secret PUSH_DISPATCH_SECRET.
#   3. Stores the push function URL + the same secret in Supabase Vault (read by private.dispatch_push).
#      Only on first run — existing Vault entries are left untouched.
#   4. Deploys `delete-account` + `sync-premium` (JWT required), `push` + `revenuecat-webhook` (shared secret) without Docker.
#      RevenueCat secrets (REVENUECAT_SECRET_KEY, REVENUECAT_WEBHOOK_AUTH) are set separately — see docs/PLAN.md.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; source .env; set +a

already=$(npx -y supabase@latest db query --remote --read-only --output-format json \
  "select count(*) as n from vault.secrets where name in ('push_dispatch_url','push_dispatch_secret')" |
  python3 -c "import json,sys; print(json.load(sys.stdin)['rows'][0]['n'])")

if [ "$already" != "2" ]; then
  SECRET="$(openssl rand -hex 32)"
  npx -y supabase@latest secrets set --yes "PUSH_DISPATCH_SECRET=$SECRET"
  npx -y supabase@latest db query --remote --yes \
    "select vault.create_secret('https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/push', 'push_dispatch_url', 'Edge Function called by private.dispatch_push');
     select vault.create_secret('${SECRET}', 'push_dispatch_secret', 'Shared secret for the push Edge Function');" > /dev/null
  unset SECRET
  echo "Push secret created and stored."
else
  echo "Push secret already configured — leaving it as is."
fi

npx -y supabase@latest functions deploy delete-account push revenuecat-webhook sync-premium --use-api --yes
echo "Done."
