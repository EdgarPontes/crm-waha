# Guia de Deploy

## Docker Compose (Recomendado)

### Pré-requisitos

- Docker 24+ e Docker Compose v2+
- PostgreSQL 15+ rodando (externo ou adicionar ao compose)
- WAHA rodando (externo ou adicionar ao compose)

### Deploy Rápido

1. Configure as variáveis de ambiente:

```bash
cp .env.docker.example .env
# Edite .env com suas credenciais reais
```

2. Inicie a aplicação:

```bash
docker compose up -d
```

3. Execute as migrações do banco (necessário apenas na primeira vez):

```bash
docker compose exec app node -e "
const { execSync } = require('child_process');
execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
"
```

4. Acesse a aplicação em `http://localhost:9000`

### Serviços Incluídos

O `docker-compose.yml` inclui um serviço `app` com:
- Porta mapeada: `9000:9000`
- Healthcheck: endpoint da aplicação
- Resource limits: 2 CPUs / 1 GB máx, 1 CPU / 512 MB reserva
- Volume: logs em `./logs`
- Rede: `crm-network` (bridge)

### Docker Compose Completo (com PostgreSQL e WAHA)

Para um deploy auto-contido, adicione ao `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crm_waha
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: senha_segura
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - crm-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_user -d crm_waha"]
      interval: 10s

  waha:
    image: devlikeapro/waha:latest
    ports:
      - "3001:3000"
    environment:
      - WAHA_MEDIA_STORAGE=/waha-media
    volumes:
      - waha-media:/waha-media
    networks:
      - crm-network
    restart: unless-stopped

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: crm-waha
    ports:
      - "9000:9000"
    environment:
      DATABASE_URL: postgresql://crm_user:senha_segura@db:5432/crm_waha
      WAHA_API_URL: http://waha:3000
      WAHA_API_KEY: ${WAHA_API_KEY}
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
      NODE_ENV: production
      PORT: "9000"
    depends_on:
      db:
        condition: service_healthy
      waha:
        condition: service_started
    networks:
      - crm-network
    restart: unless-stopped

volumes:
  pgdata:
  waha-media:

networks:
  crm-network:
    driver: bridge
```

### Deploy Manual (Node.js)

```bash
# Instalar dependências
pnpm install --frozen-lockfile

# Build da aplicação
pnpm run build

# Configurar ambiente
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export JWT_SECRET="seu-segredo-jwt"
export NODE_ENV="production"
export PORT="9000"

# Executar migrações
npx drizzle-kit migrate

# Iniciar
pnpm start
```

### Health Check

O endpoint de health check é `GET /` (retorna o HTML da aplicação).

Para monitoramento, verifique:
- Status HTTP 200 no endpoint raiz
- Conexão com banco de dados
- Conexão com WAHA (se configurado)

### Backup

```bash
# Backup do banco PostgreSQL
pg_dump -h localhost -U crm_user -d crm_waha -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -h localhost -U crm_user -d crm_waha backup_20250101.dump
```

### Variáveis de Ambiente para Produção

| Variável | Recomendação |
|----------|-------------|
| `JWT_SECRET` | String aleatória longa (mín. 32 caracteres) |
| `DATABASE_URL` | PostgreSQL com SSL em produção |
| `NODE_ENV` | `production` |
| `PORT` | `9000` (ajustável) |
| `WAHA_API_URL` | URL do WAHA na mesma rede Docker |

### Segurança

- Use SSL/TLS no PostgreSQL em produção
- Altere o `JWT_SECRET` padrão
- Mantenha as API keys em variáveis de ambiente, nunca no código
- Use um reverse proxy (Nginx, Traefik) para HTTPS
- Restrinja o acesso à porta do banco de dados
