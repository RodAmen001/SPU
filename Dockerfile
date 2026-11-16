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

# ── v6.0 — LES 12 VOIX NEURONALES EN PRODUCTION ──────────────────────────────
# ffmpeg (décalage de hauteur des voix) + binaire Piper + les modèles français
# téléchargés UNE fois à la construction depuis le cloud du concepteur
# (Hugging Face : Rodamen/spu-voix — voix libres, MIT / CC-BY). Ensuite, la
# génération de voix reste 100 % locale : aucun appel réseau à la lecture.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p voix-piper/piper voix-piper/modeles \
 && curl -sL -o /tmp/piper.tar.gz "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" \
 && tar xzf /tmp/piper.tar.gz -C /tmp \
 && cp -r /tmp/piper/* voix-piper/piper/ \
 && rm /tmp/piper.tar.gz \
 && for f in fr_FR-tom-medium fr_FR-gilles-low fr_FR-mls-medium fr_FR-upmc-medium; do \
      curl -sL --retry 3 -o "voix-piper/modeles/$f.onnx" "https://huggingface.co/Rodamen/spu-voix/resolve/main/$f.onnx?download=true" \
      && curl -sL --retry 3 -o "voix-piper/modeles/$f.onnx.json" "https://huggingface.co/Rodamen/spu-voix/resolve/main/$f.onnx.json?download=true" \
      && echo "voix $f : $(stat -c%s voix-piper/modeles/$f.onnx) octets"; \
    done

EXPOSE 7860
ENTRYPOINT ["./docker-entrypoint.sh"]
