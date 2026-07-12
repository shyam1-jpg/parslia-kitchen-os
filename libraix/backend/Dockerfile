FROM node:22-alpine
WORKDIR /app
COPY libraix/backend/package*.json ./
RUN npm ci --omit=dev
COPY libraix/backend/tsconfig.json ./
COPY libraix/backend/src ./src
RUN npm install typescript tsx --save-dev && npx tsc
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/libraix.db
EXPOSE 3001
RUN mkdir -p /data
CMD ["node", "dist/index.js"]
