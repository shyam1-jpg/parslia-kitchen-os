FROM node:22-alpine
WORKDIR /app
COPY services/platform-api/package.json services/platform-api/package-lock.json* ./services/platform-api/
RUN cd services/platform-api && npm install --omit=dev --no-audit --no-fund
COPY domains ./domains
COPY db ./db
COPY services/platform-api ./services/platform-api
WORKDIR /app/services/platform-api
ENV NODE_ENV=production PORT=4000 VEDANTA_DB_DIR=/app/db
EXPOSE 4000
USER node
CMD ["sh", "-c", "npx tsx src/migrate.ts && npx tsx src/server.ts"]
