#!/usr/bin/env bash
# UAT ONLY. Prints a 6-digit sign-in code for an email, without sending any email.
# Use it with the app's "I have a test code" button (shown only in development builds).
#
#   supabase/scripts/dev-login-code.sh tester1@example.com
#
# Why: on the Supabase free plan the built-in mailer sends links (not codes), only to team
# members, max 2/hour. Remove this workflow once a custom SMTP provider (e.g. Resend) is set up.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; source .env; set +a

UAT_REF="qwbqzasmyatjnmnuwrun"   # refuse to run against any other project (e.g. production)
[ "${SUPABASE_PROJECT_REF}" = "$UAT_REF" ] || { echo "Refusing: not the UAT project" >&2; exit 1; }
EMAIL="${1:?usage: dev-login-code.sh <email>}"
URL="https://${SUPABASE_PROJECT_REF}.supabase.co"

SECRET=$(curl -fsS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/api-keys?reveal=true" |
  python3 -c "import json,sys; print(next(k['api_key'] for k in json.load(sys.stdin) if k.get('type')=='secret'))")

admin() { curl -sS -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" "$@"; }

# Create the user if needed (already-exists errors are fine), then mint a code.
admin -X POST "$URL/auth/v1/admin/users" -d "{\"email\":\"$EMAIL\",\"email_confirm\":true}" > /dev/null
admin -X POST "$URL/auth/v1/admin/generate_link" -d "{\"type\":\"magiclink\",\"email\":\"$EMAIL\"}" |
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('email_otp') or d.get('properties',{}).get('email_otp') or d)"
