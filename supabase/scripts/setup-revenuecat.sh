#!/usr/bin/env bash
# One-time RevenueCat server setup for the linked Supabase project (UAT). Safe to re-run.
#
#   supabase/scripts/setup-revenuecat.sh
#
# 1. Asks for the RevenueCat SECRET API key (RevenueCat → Project settings → API keys → Secret, starts "sk_").
#    Input is hidden; it is stored only as the Edge Function secret REVENUECAT_SECRET_KEY.
# 2. Creates a random webhook password (once), saves it in the root .env (git-ignored) as
#    REVENUECAT_WEBHOOK_AUTH and as an Edge Function secret.
# 3. Prints the webhook URL. In RevenueCat → Integrations → Webhooks, paste the URL and set
#    "Authorization header value" to the REVENUECAT_WEBHOOK_AUTH value from .env.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; source .env; set +a

read -r -s -p "RevenueCat secret API key (sk_…, leave empty to skip): " RC_KEY; echo
if [ -n "$RC_KEY" ]; then
  case "$RC_KEY" in sk_*) ;; *) echo "That doesn't look like a secret key (should start with sk_)."; exit 1 ;; esac
  npx -y supabase@latest secrets set --yes "REVENUECAT_SECRET_KEY=$RC_KEY" > /dev/null
  echo "Secret key stored."
fi
unset RC_KEY

if ! grep -q '^REVENUECAT_WEBHOOK_AUTH=' .env; then
  WEBHOOK_AUTH="$(openssl rand -hex 32)"
  printf '\n# RevenueCat webhook Authorization header value (RevenueCat → Integrations → Webhooks)\nREVENUECAT_WEBHOOK_AUTH=%s\n' "$WEBHOOK_AUTH" >> .env
else
  WEBHOOK_AUTH="$(grep '^REVENUECAT_WEBHOOK_AUTH=' .env | cut -d= -f2-)"
fi
npx -y supabase@latest secrets set --yes "REVENUECAT_WEBHOOK_AUTH=$WEBHOOK_AUTH" > /dev/null
unset WEBHOOK_AUTH

echo
echo "Webhook URL:  https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/revenuecat-webhook"
echo "Auth header:  the REVENUECAT_WEBHOOK_AUTH value in .env"
echo "Then press 'Send test event' in RevenueCat — it should show 200."
