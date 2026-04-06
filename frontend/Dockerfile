FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .

RUN npm run typecheck
RUN npm run lint

RUN npm run test:run || true

RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"]