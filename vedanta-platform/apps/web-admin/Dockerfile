# Build the static admin app, serve it with nginx. The API URL is baked in at build time:
#   docker build --build-arg NEXT_PUBLIC_API_URL=/api ...   (Caddy forwards /api to the API)
FROM node:22-alpine AS build
WORKDIR /app
COPY apps/web-admin/package.json apps/web-admin/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY apps/web-admin .
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/out /usr/share/nginx/html
COPY apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
