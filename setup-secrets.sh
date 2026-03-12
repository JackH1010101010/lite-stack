#!/usr/bin/env bash
# =============================================================================
# setup-secrets.sh  —  Run this ONCE from your local terminal to:
#   1. Push the latest commits from Claude's session
#   2. Set all missing GitHub Actions secrets
#   3. Guide you through the GSC service account setup
#
# Prerequisites:
#   - GitHub CLI (gh) installed: https://cli.github.com/
#   - Logged in: gh auth login
#   - jq installed: brew install jq  (for GSC JSON handling)
# =============================================================================

set -e

REPO="JackH1010101010/lite-stack"
LUXSTAY_REPO="JackH1010101010/luxstay"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         Lite-Stack Secrets & CI Setup Script         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Push commits ────────────────────────────────────────
echo "▶ Step 1: Push commits"
echo "  Run these from your Lite-Stack directory:"
echo ""
echo "    git push"
echo "    cd luxstay && git push && cd .."
echo ""
read -p "  Press Enter once you've pushed (or press Enter to skip)..."

# ── Step 2: ANTHROPIC_API_KEY ───────────────────────────────────
echo ""
echo "▶ Step 2: ANTHROPIC_API_KEY"
echo "  Used by seo-pages.js to write AI-enhanced editorial content"
echo "  on SEO landing pages. Without it, pages use static templates."
echo ""
echo "  Get your key from: https://console.anthropic.com/settings/keys"
echo ""
read -s -p "  Paste your Anthropic API key (hidden): " ANTHROPIC_KEY
echo ""

if [ -n "$ANTHROPIC_KEY" ]; then
  echo "$ANTHROPIC_KEY" | gh secret set ANTHROPIC_API_KEY --repo="$REPO"
  echo "  ✓ ANTHROPIC_API_KEY set on $REPO"
else
  echo "  ⏭  Skipped"
fi

# ── Step 3: GSC_SITE_URLS ──────────────────────────────────────
echo ""
echo "▶ Step 3: GSC_SITE_URLS"
echo "  These are the Search Console property URLs (must match exactly)."
echo ""
GSC_URLS="https://luxury.lux-stay-members.com/,https://maldives.lux-stay-members.com/,https://dubai.lux-stay-members.com/"
echo "  Setting to: $GSC_URLS"
echo "$GSC_URLS" | gh secret set GSC_SITE_URLS --repo="$REPO"
echo "  ✓ GSC_SITE_URLS set"

# ── Step 4: PostHog secrets ─────────────────────────────────────
echo ""
echo "▶ Step 4: PostHog secrets"
echo "  Needed by weekly digest + reconcile jobs for funnel metrics."
echo ""
echo "  POSTHOG_PERSONAL_KEY:"
echo "    app.posthog.com → Settings → Personal API Keys"
read -s -p "  Paste POSTHOG_PERSONAL_KEY (hidden, Enter to skip): " POSTHOG_PERSONAL_KEY
echo ""
if [ -n "$POSTHOG_PERSONAL_KEY" ]; then
  echo "$POSTHOG_PERSONAL_KEY" | gh secret set POSTHOG_PERSONAL_KEY --repo="$REPO"
  echo "  ✓ POSTHOG_PERSONAL_KEY set on $REPO"
else
  echo "  ⏭  Skipped"
fi
echo ""
echo "  POSTHOG_PROJECT_ID:"
echo "    In PostHog URL: app.posthog.com/project/<PROJECT_ID>/..."
read -p "  Paste POSTHOG_PROJECT_ID (Enter to skip): " POSTHOG_PROJECT_ID
if [ -n "$POSTHOG_PROJECT_ID" ]; then
  echo "$POSTHOG_PROJECT_ID" | gh secret set POSTHOG_PROJECT_ID --repo="$REPO"
  echo "  ✓ POSTHOG_PROJECT_ID set on $REPO"
else
  echo "  ⏭  Skipped"
fi

# ── Step 5: GOOGLE_SERVICE_ACCOUNT_JSON ────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         Google Service Account Setup                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  The weekly digest needs a Google service account to pull"
echo "  clicks, impressions and top queries from Search Console."
echo ""
echo "  STEP A — Create/enable Search Console API:"
echo "    1. Go to: https://console.cloud.google.com/apis/library/searchconsole.googleapis.com"
echo "    2. Click 'Enable'"
echo ""
echo "  STEP B — Create service account:"
echo "    1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts"
echo "    2. Click 'Create service account'"
echo "    3. Name: lite-stack-gsc-reader"
echo "    4. Skip role assignment (click Continue → Done)"
echo "    5. Click the new service account → Keys tab"
echo "    6. Add Key → Create new key → JSON → Download"
echo ""
echo "  STEP C — Grant Search Console access:"
echo "    1. Go to: https://search.google.com/search-console/users"
echo "       (signed in as luxstaymembers@gmail.com)"
echo "    2. For EACH property (luxury / maldives / dubai):"
echo "       Settings → Users and permissions → Add user"
echo "       Email = the service account email from step B"
echo "       Permission = Full"
echo ""
echo "  STEP D — Set the secret:"
echo "    Once you have the JSON key file downloaded, run:"
echo ""
echo "    gh secret set GOOGLE_SERVICE_ACCOUNT_JSON --repo=$REPO < /path/to/key.json"
echo ""
read -p "  Do you have the JSON key file ready now? (y/N): " HAS_JSON

if [[ "$HAS_JSON" =~ ^[Yy]$ ]]; then
  read -p "  Path to JSON key file: " JSON_PATH
  if [ -f "$JSON_PATH" ]; then
    gh secret set GOOGLE_SERVICE_ACCOUNT_JSON --repo="$REPO" < "$JSON_PATH"
    echo "  ✓ GOOGLE_SERVICE_ACCOUNT_JSON set on $REPO"
  else
    echo "  ✗ File not found: $JSON_PATH"
    echo "  Run manually:  gh secret set GOOGLE_SERVICE_ACCOUNT_JSON --repo=$REPO < your-key.json"
  fi
else
  echo ""
  echo "  → Come back and run when ready:"
  echo "    gh secret set GOOGLE_SERVICE_ACCOUNT_JSON --repo=$REPO < your-key.json"
fi

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                     Done!                            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Secrets set. The next push to main (or Sunday cron) will:"
echo "  • Generate AI-enhanced SEO pages (with ANTHROPIC_API_KEY)"
echo "  • Include GSC data in the weekly digest GitHub issue"
echo "  • Deploy luxstay SEO pages + sitemap alongside index.html"
echo ""
echo "  Verify secrets at:"
echo "  https://github.com/$REPO/settings/secrets/actions"
echo ""
