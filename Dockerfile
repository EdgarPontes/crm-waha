# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml patches/ ./

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Instalar pnpm no runtime também
RUN npm install -g pnpm

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml patches/ ./

# Instalar apenas dependências de produção
RUN pnpm install --frozen-lockfile --prod

# Copiar build da stage anterior
COPY --from=builder /app/dist ./dist

# Criar diretório para logs
RUN mkdir -p .manus-logs

# Expor porta
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
