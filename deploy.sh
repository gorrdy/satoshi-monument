#!/usr/bin/env bash
# Zero-downtime deploy: build jednou, pak restart instancí po jedné.
# nginx (upstream monument_app: 3041 + 3042) mezitím obsluhuje z té druhé.
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ npm run build…"
npm run build

restart_one() {
  local svc=$1 port=$2
  echo "▶ restart $svc (:$port)…"
  sudo systemctl restart "$svc"
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "http://localhost:$port/cs"; then
      echo "  ✓ :$port naběhl"
      return 0
    fi
    sleep 1
  done
  echo "  ✗ $svc nenaběhl do 30 s!" >&2
  return 1
}

# Po jedné — druhá instance drží provoz.
restart_one monument-gorrdy.service 3041
restart_one monument-gorrdy2.service 3042

echo "✓ deploy hotov (zero-downtime)"
