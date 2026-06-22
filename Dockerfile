FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/index.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
RUN mkdir -p db
EXPOSE 3000
CMD ["npm", "start"]
