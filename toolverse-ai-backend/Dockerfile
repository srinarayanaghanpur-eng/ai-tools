# TOOLVERSE AI backend — production image (Debian slim, Node 20).
# Native deps (sharp, ffmpeg-static, onnxruntime) resolve to Linux binaries
# automatically via npm. Poppler is installed via apt for PDF rasterization.
FROM node:20-bookworm-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# System deps: poppler-utils (pdftoppm for PDF->JPG/PNG). tesseract languages
# download on first OCR run (~5MB, cached on persistent disk if mounted).
RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY tsconfig.json ./
RUN npx -y typescript@5.5 tsc -p tsconfig.json

# Runtime env (override in your host: Render/Railway/Fly/VPS)
ENV PORT=4000 \
    DATABASE_PATH=/data/toolverse.sqlite \
    STORAGE_PROVIDER=local \
    STORAGE_LOCAL_ROOT=/data/storage

# Persist /data (DB + file storage) with a volume, otherwise restarts wipe it.
VOLUME ["/data"]

EXPOSE 4000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
