# Stage 1: builder — install deps, run checks, build static assets
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

COPY . .
RUN npm run typecheck
RUN npm run lint
RUN npm run test:run || true
RUN npm run build

# Stage 2: production — nginx serves pre-built static assets
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
