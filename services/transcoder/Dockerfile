# Imagen del worker: Node 22 + ffmpeg. Despliégala en cualquier servicio de contenedores
# (Fly.io, Cloud Run, Railway, un VPS…) con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY como secretos.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
USER node
CMD ["node", "src/worker.ts"]
