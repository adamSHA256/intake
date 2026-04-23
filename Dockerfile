FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY seed ./seed
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh && chown -R app:app /app
USER app
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/index.js"]
