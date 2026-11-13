# ─────────────────────────────────────────────────────────────────────────────
# SPU — Système Parabolique Universel (image de production autonome)
# Construit l'application Next.js (sortie standalone), prépare la base SQLite
# avec les 65 paraboles (50 adultes + 15 contes enfants), et sert le tout.
#
# Construire :  docker build -t spu .
# Lancer    :  docker run -p 7860:7860 spu
# Port      :  7860 par défaut (port attendu par Hugging Face Spaces Docker) ;
#              en local, surcharger avec -e PORT=3000 si besoin.
# ─────────────────────────────────────────────────────────────────────────────

# ── Étape 1 : dépendances ──
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile
RUN bunx prisma generate

# ── Étape 2 : construction ──
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/custom.db
# Base SQLite prête à l'emploi : schéma + corpus complet de 65 paraboles
RUN mkdir -p db && bunx prisma db push --skip-generate && bun run scripts/seed.ts
RUN bun run build

# ── Étape 3 : exécution ──
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/db/custom.db

# Serveur standalone Next.js + ressources statiques
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Base de données construite à l'étape 2 (+ copie de secours pour réinitialiser)
COPY --from=builder /app/db ./db
COPY --from=builder /app/db ./db-origine
# Schéma et corpus (référence, réensemencement futur)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/data ./src/data
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 7860
ENTRYPOINT ["./docker-entrypoint.sh"]
