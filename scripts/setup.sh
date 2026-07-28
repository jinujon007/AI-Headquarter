#!/usr/bin/env bash
# AI HQ — Setup pre-flight check
# Run: bash scripts/setup.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "${RED}✗${NC}  $1"; FAILED=1; }

FAILED=0

echo ""
echo -e "${BLUE}AI HQ — Pre-flight Setup Check${NC}"
echo "================================"
echo ""

# ── Node.js ──────────────────────────────────────────────────────────────────
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    fail "Node.js not found. Install from https://nodejs.org (v22+)"
else
    NODE_VERSION=$(node -e "process.stdout.write(process.version)")
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 22 ]; then
        fail "Node.js $NODE_VERSION found — v22+ required"
    else
        ok "Node.js $NODE_VERSION"
    fi
fi

# ── npm ───────────────────────────────────────────────────────────────────────
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    fail "npm not found"
else
    ok "npm $(npm --version)"
fi

# ── Ollama ───────────────────────────────────────────────────────────────────
echo "Checking Ollama..."
if ! command -v ollama &> /dev/null; then
    warn "Ollama not found. Install from https://ollama.com"
    warn "Without Ollama, you must use BYOK (API key in dashboard Settings)."
else
    ok "Ollama installed"

    # Check if Ollama is running
    if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
        ok "Ollama is running"

        # Check for the default model
        MODEL="${OLLAMA_MODEL:-llama3.2:3b}"
        if ollama list 2>/dev/null | grep -q "$MODEL"; then
            ok "Model '$MODEL' is available"
        else
            echo ""
            warn "Model '$MODEL' not found. Pulling now (~2.0 GB)..."
            ollama pull "$MODEL"
            ok "Model '$MODEL' downloaded"
        fi
    else
        warn "Ollama is installed but not running."
        warn "Start it with: ollama serve"
        warn "Then pull the model: ollama pull ${OLLAMA_MODEL:-llama3.2:3b}"
    fi
fi

# ── .env ──────────────────────────────────────────────────────────────────────
echo "Checking .env..."
if [ ! -f ".env" ]; then
    echo ""
    warn ".env file not found. Creating from .env.example..."
    cp .env.example .env

    # Generate AUTH_SECRET
    if command -v node &> /dev/null; then
        SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/change-me-generate-with-the-command-above/$SECRET/" .env
        else
            sed -i "s/change-me-generate-with-the-command-above/$SECRET/" .env
        fi
        ok "AUTH_SECRET generated and written to .env"
    fi

    warn "Set ADMIN_PASSWORD in .env before running npm run dev"
else
    ok ".env file exists"

    # Check ADMIN_PASSWORD is set
    if grep -q "change-me-strong-password" .env 2>/dev/null; then
        warn "ADMIN_PASSWORD is still the default — change it in .env"
    else
        ok "ADMIN_PASSWORD is set"
    fi

    # Check AUTH_SECRET is set
    if grep -q "change-me-generate" .env 2>/dev/null; then
        warn "AUTH_SECRET is still the placeholder — run:"
        warn "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        warn "and paste the result into .env as AUTH_SECRET"
    else
        ok "AUTH_SECRET is set"
    fi
fi

# ── Dashboard .env.local (optional) ──────────────────────────────────────────
# The dashboard reads the root .env via next.config.mjs; .env.local is only an
# optional override and takes precedence when present.
echo "Checking dashboard .env.local..."
if [ ! -f "apps/dashboard/.env.local" ]; then
    warn "apps/dashboard/.env.local not found. Creating from example..."
    cp apps/dashboard/.env.local.example apps/dashboard/.env.local

    # Reuse the credentials from root .env so both stay in sync
    if [ -f ".env" ]; then
        ROOT_SECRET=$(grep '^AUTH_SECRET=' .env | cut -d= -f2-)
        ROOT_PASSWORD=$(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2-)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=$ROOT_SECRET|" apps/dashboard/.env.local
            sed -i '' "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ROOT_PASSWORD|" apps/dashboard/.env.local
        else
            sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$ROOT_SECRET|" apps/dashboard/.env.local
            sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ROOT_PASSWORD|" apps/dashboard/.env.local
        fi
        ok "apps/dashboard/.env.local created (credentials copied from root .env)"
    else
        warn "Fill in ADMIN_PASSWORD and AUTH_SECRET in apps/dashboard/.env.local"
    fi
else
    ok "apps/dashboard/.env.local exists"
fi

# ── Dependencies ──────────────────────────────────────────────────────────────
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    ok "node_modules exists (run 'npm install' to update)"
else
    echo ""
    warn "node_modules not found. Installing..."
    npm install
    ok "Dependencies installed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "================================"
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}All checks passed.${NC}"
    echo ""
    echo "Run:  npm run dev"
    echo "Open: http://localhost:3000"
else
    echo -e "${RED}Some checks failed — fix the issues above before running npm run dev.${NC}"
    exit 1
fi
echo ""
