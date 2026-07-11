# CRM Omnichannel WAHA - Docker Setup

Guia rápido para executar a aplicação com Docker e Docker Compose.

## 🚀 Quick Start (30 segundos)

### 1. Preparar Arquivo de Configuração

```bash
cp .env.docker.example .env
```

### 2. Editar Configurações

```bash
# Edite o arquivo .env com suas credenciais de banco de dados
nano .env
```

Configurações essenciais:

```env
DB_TYPE=mysql                    # mysql ou postgres
DB_HOST=seu-db-host.com         # Host do banco de dados
DB_PORT=3306                     # Porta (3306 MySQL, 5432 PostgreSQL)
DB_USER=crm_user                 # Usuário do banco
DB_PASSWORD=sua_senha_segura     # Senha do banco
DB_NAME=crm_waha                 # Nome do banco
```

### 3. Iniciar a Aplicação

```bash
docker-compose up -d
```

### 4. Acessar

Abra seu navegador em: **http://localhost:3000**

## 📋 Comandos Úteis

```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f app

# Parar
docker-compose stop

# Reiniciar
docker-compose restart app

# Parar e remover
docker-compose down
```

## 🔧 Configurações Avançadas

### Usar String de Conexão Completa

Em vez de componentes individuais, você pode usar uma string de conexão:

```env
DB_TYPE=mysql
DB_URL=mysql://crm_user:senha@localhost:3306/crm_waha
```

### Exemplos de Strings de Conexão

**MySQL Local:**

```
mysql://root:password@localhost:3306/crm_waha
```

**PostgreSQL Local:**

```
postgresql://postgres:password@localhost:5432/crm_waha
```

**AWS RDS MySQL:**

```
mysql://admin:senha@crm-db.xxxxx.rds.amazonaws.com:3306/crm_waha
```

**AWS RDS PostgreSQL:**

```
postgresql://postgres:senha@crm-db.xxxxx.rds.amazonaws.com:5432/crm_waha
```

## 🐳 Estrutura de Arquivos

```
crm-omnichannel-waha/
├── Dockerfile              # Imagem Docker
├── docker-compose.yml      # Orquestração
├── .env.docker.example     # Exemplo de configuração
├── .dockerignore            # Arquivos ignorados no build
├── DOCKER_SETUP.md         # Guia detalhado
└── ...
```

## 🏗️ Build Manual

Se quiser fazer build customizado:

```bash
# Build da imagem
docker build -t crm-omnichannel-waha:latest .

# Executar container
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=localhost \
  -e DB_USER=crm_user \
  -e DB_PASSWORD=senha \
  -e DB_NAME=crm_waha \
  --name crm-app \
  crm-omnichannel-waha:latest
```

## 🔐 Segurança

1. **Nunca commit .env com dados sensíveis**

   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use senhas fortes**

   ```bash
   openssl rand -base64 32
   ```

3. **Restrinja acesso ao banco de dados**
   - Configure firewall
   - Use SSL/TLS para conexões remotas

## 🐛 Troubleshooting

### Porta 3000 já em uso

Edite `docker-compose.yml`:

```yaml
ports:
  - "3001:3000" # Usar porta 3001 ao invés
```

### Erro de conexão com banco de dados

```bash
# Verificar variáveis de ambiente
docker-compose exec app env | grep DB_

# Testar conectividade
docker-compose exec app ping seu-db-host.com
```

### Container não inicia

```bash
# Ver logs de erro
docker-compose logs app

# Validar arquivo .env
cat .env

# Validar docker-compose.yml
docker-compose config
```

## 📚 Documentação Completa

Para guia detalhado, veja: [DOCKER_SETUP.md](./DOCKER_SETUP.md)

## 🎯 Próximos Passos

1. ✅ Configurar `.env`
2. ✅ Executar `docker-compose up -d`
3. ✅ Acessar http://localhost:3000
4. ✅ Fazer login com Manus OAuth
5. ✅ Configurar WAHA e IA (opcional)

## 💡 Dicas

- Use `docker-compose logs -f` para ver logs em tempo real
- Altere `DB_HOST` para `host.docker.internal` se usar banco local no Windows/Mac
- Para produção, use variáveis de ambiente seguras (secrets, vaults, etc.)

---

**Precisa de ajuda?** Consulte [DOCKER_SETUP.md](./DOCKER_SETUP.md) para documentação completa.
