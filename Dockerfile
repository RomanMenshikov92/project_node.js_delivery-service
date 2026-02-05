# Используем конкретное имя для первой стадии
FROM node:20-alpine AS build_stage

WORKDIR /app

COPY package*.json ./
# Устанавливаем ВСЕ зависимости (и production, и dev) для сборки
RUN npm ci --ignore-scripts

COPY src ./src
COPY tsconfig.json ./
# Запускаем сборку - теперь tsc будет доступен
RUN npm run build

# --- Начало второй стадии сборки (production stage) ---
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Копируем ТОЛЬКО production зависимости из node_modules
# и скомпилированный код (dist) из build_stage
WORKDIR /app
# Установка production зависимостей заново в чистом образе
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts --no-audit

COPY --from=build_stage --chown=nextjs:nodejs /app/dist ./dist

COPY --chown=nextjs:nodejs package.json .

USER nextjs

# Убедитесь, что порт соответствует вашему app.ts в продакшене (PROD_PORT)
EXPOSE 9999

CMD ["node", "dist/app.js"]