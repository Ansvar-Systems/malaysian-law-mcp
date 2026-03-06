#!/bin/bash
# Download database from GitHub Releases for Vercel deployment.
# Always downloads to ensure build cache doesn't serve stale/empty DB.
set -e

VERSION=$(node -p "require('./package.json').version")
REPO="Ansvar-Systems/malaysian-law-mcp"
TAG="v${VERSION}"
ASSET="database.db.gz"
OUTPUT="data/database.db"

URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"
echo "[download-db] Downloading database from GitHub releases..."
echo "  URL: ${URL}"

mkdir -p data
curl -fSL --retry 3 --retry-delay 5 "$URL" | gunzip > "${OUTPUT}.tmp"
mv "${OUTPUT}.tmp" "$OUTPUT"

echo "[download-db] Database ready at $OUTPUT"
