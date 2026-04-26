# Stage 1: Install production dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Instalamos solo dependencias de producción
RUN npm ci --omit=dev

# Stage 2: Build the application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Instalamos todas las dependencias para poder compilar
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Seteamos el entorno a producción
ENV NODE_ENV=production

# Creamos el directorio de la app y usamos el usuario node (non-root) por seguridad
RUN chown node:node /app
USER node

# Copiamos solo lo necesario de los stages anteriores
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# El puerto que expone NestJS
EXPOSE 3000

# Healthcheck para monitorear el estado del contenedor
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Comando de arranque
CMD ["node", "dist/main"]
