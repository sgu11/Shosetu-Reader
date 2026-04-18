#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Load demo env
set -a
# shellcheck disable=SC1091
source demo/.env.demo
set +a

mkdir -p demo/output

DEV_PID=""
cleanup() {
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> db:migrate (demo DB)"
pnpm db:migrate

echo "==> seed demo data"
pnpm demo:seed

echo "==> start dev server"
pnpm dev > demo/output/dev.log 2>&1 &
DEV_PID=$!

echo "==> wait for app"
for i in $(seq 1 90); do
  if curl -fsS http://localhost:3000/ > /dev/null 2>&1; then
    echo "app is up"
    break
  fi
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "dev server died — check demo/output/dev.log"
    exit 1
  fi
  sleep 1
  if [[ "$i" == "90" ]]; then
    echo "app never came up after 90s"
    exit 1
  fi
done

# Small extra grace for first-request compilation
sleep 2

echo "==> webreel record"
npx webreel record --config demo/webreel.config.json

echo "==> done"
ls -la demo/output/shosetu-demo.mp4
