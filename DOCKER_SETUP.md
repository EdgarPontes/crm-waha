# Docker e Docker Compose - Guia Completo

Este guia explica como executar o CRM Omnichannel WAHA usando Docker e Docker Compose com um banco de dados externo.

## 🎯 Arquitetura

```
┌─────────────────────────────────────┐
│   Docker Container (App)            │
│   - Node.js 22 Alpine               │
│   - CRM Omnichannel WAHA            │
│   - Porta: 3000                     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Banco de Dados Externo            │
│   - MySQL / PostgreSQL / TiDB       │
│   - Host/Port: Configurável         │
│   - Gerenciado externamente         │
└─────────────────────────────────────┘
```

## 📋 Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+
- Um banco de dados externo (MySQL, PostgreSQL, etc.)
- Credenciais de acesso ao banco de dados

## 🚀 Quick Start

### 1. Clonar o Repositório

```bash
git clone <seu-repositorio>
cd crm-omnichannel-waha
```

### 2. Criar Arquivo .env

```bash
cp .env.docker.example .env
```

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env` com suas credenciais:

```bash
# Banco de dados
DB_TYPE=mysql
DB_HOST=seu-db-host.com
DB_PORT=3306
DB_USER=crm_user
DB_PASSWORD=sua_senha_segura
DB_NAME=crm_waha

# OAuth Manus
VITE_APP_ID=seu_app_id
JWT_SECRET=sua_secret_jwt

# Outras configurações...
```

### 4. Iniciar a Aplicação

```bash
docker-compose up -d
```

### 5. Verificar Status

```bash
# Ver logs
docker-compose logs -f app

# Ver containers rodando
docker-compose ps

# Acessar a aplicação
# http://localhost:3000
```

## 📝 Configuração Detalhada

### Opção 1: Componentes Individuais

```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=crm_user
DB_PASSWORD=senha_segura
DB_NAME=crm_waha
```

### Opção 2: String de Conexão Completa

```env
DB_TYPE=mysql
DB_URL=mysql://crm_user:senha_segura@localhost:3306/crm_waha
```

### Opção 3: PostgreSQL

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=crm_waha
```

## 🐳 Comandos Docker Compose

### Iniciar Serviços

```bash
# Iniciar em background
docker-compose up -d

# Iniciar com logs visíveis
docker-compose up

# Iniciar com rebuild
docker-compose up --build
```

### Parar Serviços

```bash
# Parar containers
docker-compose stop

# Parar e remover containers
docker-compose down

# Remover volumes também
docker-compose down -v
```

### Ver Logs

```bash
# Ver logs da aplicação
docker-compose logs app

# Ver logs em tempo real
docker-compose logs -f app

# Ver últimas 100 linhas
docker-compose logs --tail=100 app
```

### Executar Comandos

```bash
# Acessar shell do container
docker-compose exec app sh

# Executar comando específico
docker-compose exec app node --version

# Ver variáveis de ambiente
docker-compose exec app env | grep DB_
```

### Reiniciar Serviços

```bash
# Reiniciar a aplicação
docker-compose restart app

# Reiniciar tudo
docker-compose restart
```

## 🏗️ Build Customizado

### Build Local

```bash
# Build da imagem
docker build -t crm-omnichannel-waha:latest .

# Build com tag customizada
docker build -t seu-registry/crm-omnichannel-waha:v1.0 .
```

### Push para Registry

```bash
# Docker Hub
docker push seu-usuario/crm-omnichannel-waha:latest

# GitHub Container Registry
docker push ghcr.io/seu-usuario/crm-omnichannel-waha:latest

# AWS ECR
docker push seu-account.dkr.ecr.us-east-1.amazonaws.com/crm-omnichannel-waha:latest
```

## 🔐 Segurança

### Variáveis Sensíveis

Nunca commit o arquivo `.env` com dados sensíveis:

```bash
# Adicionar ao .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### Usar Secrets do Docker

Para produção, use Docker Secrets:

```bash
# Criar secret
echo "sua_senha_segura" | docker secret create db_password -

# Usar no docker-compose
# secrets:
#   db_password:
#     external: true
```

### Limitar Recursos

O docker-compose.yml já inclui limites:

```yaml
deploy:
  resources:
    limits:
      cpus: "2"
      memory: 1G
    reservations:
      cpus: "1"
      memory: 512M
```

## 📊 Monitoramento

### Health Check

O container inclui health check automático:

```bash
# Ver status de saúde
docker-compose ps

# Ver detalhes do health check
docker inspect crm-omnichannel-waha | grep -A 10 Health
```

### Logs de Erro

```bash
# Ver erros
docker-compose logs app | grep ERROR

# Ver warnings
docker-compose logs app | grep WARN

# Ver últimas 50 linhas
docker-compose logs --tail=50 app
```

### Métricas

```bash
# Ver uso de CPU e memória
docker stats crm-omnichannel-waha

# Ver detalhes do container
docker inspect crm-omnichannel-waha
```

## 🔄 Atualizações

### Atualizar Imagem

```bash
# Pull da nova versão
docker-compose pull

# Rebuild
docker-compose up -d --build

# Remover imagens antigas
docker image prune
```

### Backup de Dados

```bash
# Backup dos logs
docker cp crm-omnichannel-waha:/app/.manus-logs ./backup-logs

# Backup do banco de dados (externo)
# Use ferramentas específicas do seu banco de dados
```

## 🐛 Troubleshooting

### Erro: "Connection refused"

```bash
# Verificar se o container está rodando
docker-compose ps

# Ver logs de erro
docker-compose logs app

# Verificar conectividade com banco de dados
docker-compose exec app ping seu-db-host.com
```

### Erro: "Database connection failed"

```bash
# Verificar variáveis de ambiente
docker-compose exec app env | grep DB_

# Testar conexão manualmente
docker-compose exec app mysql -h DB_HOST -u DB_USER -p DB_NAME
```

### Erro: "Port already in use"

```bash
# Mudar porta no docker-compose.yml
# ports:
#   - "3001:3000"

# Ou parar o container que está usando a porta
docker ps
docker stop <container_id>
```

### Erro: "Out of memory"

```bash
# Aumentar limite de memória
# deploy:
#   resources:
#     limits:
#       memory: 2G

# Reiniciar
docker-compose restart app
```

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs app

# Verificar arquivo .env
cat .env

# Validar docker-compose.yml
docker-compose config
```

## 📈 Performance

### Otimizações

1. **Usar Alpine Linux** (já configurado)
   - Imagem menor: ~150MB vs ~900MB
   - Inicialização mais rápida

2. **Multi-stage Build** (já configurado)
   - Reduz tamanho final da imagem
   - Apenas dependências de produção

3. **Health Check** (já configurado)
   - Reinicia automaticamente se falhar
   - Monitora continuamente

4. **Resource Limits** (já configurado)
   - Evita consumo excessivo
   - Protege o host

## 🚀 Deployment em Produção

### Docker Swarm

```bash
# Inicializar swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml crm

# Ver status
docker stack ps crm
```

### Kubernetes

```bash
# Converter para Kubernetes
kompose convert -f docker-compose.yml

# Deploy
kubectl apply -f crm-omnichannel-waha-service.yaml
kubectl apply -f crm-omnichannel-waha-deployment.yaml
```

### Cloud Platforms

#### AWS ECS

```bash
# Push para ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker tag crm-omnichannel-waha:latest <account>.dkr.ecr.us-east-1.amazonaws.com/crm-omnichannel-waha:latest

docker push <account>.dkr.ecr.us-east-1.amazonaws.com/crm-omnichannel-waha:latest
```

#### Google Cloud Run

```bash
# Build e push
gcloud builds submit --tag gcr.io/PROJECT_ID/crm-omnichannel-waha

# Deploy
gcloud run deploy crm-omnichannel-waha --image gcr.io/PROJECT_ID/crm-omnichannel-waha --platform managed
```

#### Azure Container Instances

```bash
# Push para ACR
az acr build --registry <registry-name> --image crm-omnichannel-waha:latest .

# Deploy
az container create --resource-group <group> --name crm-omnichannel-waha --image <registry>.azurecr.io/crm-omnichannel-waha:latest
```

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Alpine Linux](https://alpinelinux.org/)

## 💬 Suporte

Se tiver dúvidas:

1. Verifique os logs: `docker-compose logs app`
2. Valide o arquivo .env
3. Teste a conectividade com o banco de dados
4. Consulte a documentação do Docker

---

**Nota:** O Dockerfile e docker-compose.yml estão otimizados para produção com multi-stage build, health checks e resource limits.
