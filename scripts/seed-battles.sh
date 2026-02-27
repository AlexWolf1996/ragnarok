#!/bin/bash
# Seed the Ragnarok arena with historical battles.
# Usage: ./scripts/seed-battles.sh [count] [base_url]
#
# Examples:
#   ./scripts/seed-battles.sh 50                          # 50 battles on production
#   ./scripts/seed-battles.sh 10 http://localhost:3000    # 10 battles on local

COUNT=${1:-50}
BASE_URL=${2:-https://theragnarok.fun}
SUCCESS=0
FAIL=0

echo "=== RAGNAROK ARENA SEEDER ==="
echo "Target: $BASE_URL"
echo "Battles to seed: $COUNT"
echo ""

for i in $(seq 1 $COUNT); do
  echo -n "[$i/$COUNT] Battling... "

  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/battles/quick" 2>/dev/null)
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "200" ]; then
    WINNER=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('winner',{}).get('name','?'))" 2>/dev/null || echo "?")
    LOSER=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('loser',{}).get('name','?'))" 2>/dev/null || echo "?")
    echo "OK - $WINNER defeats $LOSER"
    SUCCESS=$((SUCCESS + 1))
  elif [ "$HTTP_CODE" = "429" ]; then
    echo "RATE LIMITED - waiting 30s..."
    sleep 30
    i=$((i - 1))  # Retry this iteration
    continue
  else
    echo "FAIL (HTTP $HTTP_CODE)"
    FAIL=$((FAIL + 1))
    # Brief pause on errors
    sleep 5
  fi
done

echo ""
echo "=== SEEDING COMPLETE ==="
echo "Success: $SUCCESS / $COUNT"
echo "Failed:  $FAIL"
