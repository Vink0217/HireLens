# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN npm install -g bun && bun install
COPY . .
RUN bun run build

# Production stage
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
