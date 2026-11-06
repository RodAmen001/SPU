#!/bin/bash
# Reconstruit le zip portable (structure déjà validée par build-portable.sh).
set -e
cd /home/z/my-project
STAGING=/home/z/my-project/.portable-stage/spu-v4.1
rm -rf /home/z/my-project/.portable-stage
mkdir -p "$STAGING"
cp -r src prisma public "$STAGING/"
mkdir -p "$STAGING/db"
cp db/custom.db "$STAGING/db/"
echo 'DATABASE_URL=file:../db/custom.db' > "$STAGING/.env"
for f in package.json bun.lock next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs components.json eslint.config.mjs next-env.d.ts; do
  [ -f "$f" ] && cp "$f" "$STAGING/"
done
cp scripts/portable/DEMARRER-WINDOWS.bat scripts/portable/demarrer-mac-linux.sh scripts/portable/LISEZ-MOI-DEMARRAGE.txt "$STAGING/"
chmod +x "$STAGING/demarrer-mac-linux.sh"
rm -rf "$STAGING/.next" 2>/dev/null || true
cd /home/z/my-project/.portable-stage
rm -f /home/z/my-project/download/spu-v4.1-portable.zip
zip -qr /home/z/my-project/download/spu-v4.1-portable.zip spu-v4.1
ls -la /home/z/my-project/download/spu-v4.1-portable.zip
unzip -l /home/z/my-project/download/spu-v4.1-portable.zip | rg "sw.js|custom.db|fond-oracle|LISEZ-MOI|DEMARRER" | head -8
cd /home/z/my-project
rm -rf .portable-stage
echo "ZIP RECONSTRUIT ✓"
