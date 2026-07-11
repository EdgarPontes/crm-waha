# Configuração de PostgreSQL

Este guia explica como usar PostgreSQL como banco de dados para o CRM Omnichannel WAHA.

## 🎯 Suporte a Bancos de Dados

O projeto agora suporta:
- ✅ MySQL 5.7+
- ✅ MariaDB 10.3+
- ✅ TiDB
- ✅ **PostgreSQL 12+** (NOVO!)

## 📋 Pré-requisitos

- PostgreSQL 12+ instalado e rodando
- Credenciais de acesso (usuário, senha, host, porta)
- Um banco de dados criado ou vazio

## 🚀 Configuração Rápida

### 1. Criar Banco de Dados PostgreSQL

```sql
-- Conecte como superusuário
psql -U postgres

-- Crie o banco de dados
CREATE DATABASE crm_waha;

-- Crie um usuário (recomendado)
CREATE USER crm_user WITH PASSWORD 'senha_segura';

-- Conceda permissões
GRANT ALL PRIVILEGES ON DATABASE crm_waha TO crm_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;

-- Saia
\q
```

### 2. Configurar Variáveis de Ambiente

Via Management UI:

1. Acesse **Settings → Secrets**
2. Adicione as seguintes variáveis:

**Opção A: String de Conexão Completa (Recomendado)**

```
CUSTOM_DB_TYPE=postgres
CUSTOM_DB_URL=postgresql://crm_user:senha_segura@localhost:5432/crm_waha
```

**Opção B: Componentes Individuais**

```
CUSTOM_DB_TYPE=postgres
CUSTOM_DB_HOST=localhost
CUSTOM_DB_PORT=5432
CUSTOM_DB_USER=crm_user
CUSTOM_DB_PASSWORD=senha_segura
CUSTOM_DB_NAME=crm_waha
```

### 3. Reiniciar Servidor

O servidor reiniciará automaticamente após salvar as variáveis.

## 📝 Exemplos de Strings de Conexão

### PostgreSQL Local

```
postgresql://postgres:password@localhost:5432/crm_waha
```

### PostgreSQL Remoto

```
postgresql://crm_user:senha_segura@db.example.com:5432/crm_waha
```

### AWS RDS PostgreSQL

```
postgresql://admin:password@crm-db.xxxxx.rds.amazonaws.com:5432/crm_waha
```

### Google Cloud SQL PostgreSQL

```
postgresql://postgres:password@35.184.123.45:5432/crm_waha
```

### Azure Database for PostgreSQL

```
postgresql://admin@servername:password@servername.postgres.database.azure.com:5432/crm_waha
```

### Heroku PostgreSQL

```
postgresql://user:password@ec2-1-2-3-4.compute-1.amazonaws.com:5432/database_name
```

## 🔐 Segurança

### Criar Usuário com Permissões Limitadas

```sql
-- Crie um usuário com permissões mínimas
CREATE USER crm_readonly WITH PASSWORD 'senha_segura';
GRANT CONNECT ON DATABASE crm_waha TO crm_readonly;
GRANT USAGE ON SCHEMA public TO crm_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO crm_readonly;

-- Usuário com permissões completas
CREATE USER crm_admin WITH PASSWORD 'senha_segura';
GRANT ALL PRIVILEGES ON DATABASE crm_waha TO crm_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_admin;
```

### Usar SSL/TLS

```
postgresql://user:password@host:5432/database?sslmode=require
```

### Gerar Senha Segura

```bash
openssl rand -base64 32
```

## 🐛 Troubleshooting

### Erro: "Connection refused"

```bash
# Verifique se PostgreSQL está rodando
sudo systemctl status postgresql

# Inicie PostgreSQL se necessário
sudo systemctl start postgresql

# Verifique a porta
sudo ss -tlnp | grep 5432
```

### Erro: "FATAL: role does not exist"

```sql
-- Verifique os usuários
\du

-- Crie o usuário se não existir
CREATE USER crm_user WITH PASSWORD 'senha_segura';
```

### Erro: "FATAL: database does not exist"

```sql
-- Verifique os bancos de dados
\l

-- Crie o banco de dados se não existir
CREATE DATABASE crm_waha;
```

### Erro: "permission denied for schema public"

```sql
-- Conceda permissões
GRANT ALL PRIVILEGES ON SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
```

### Erro: "could not translate host name"

- Verifique o hostname
- Verifique a conectividade de rede
- Verifique o firewall

```bash
# Teste a conectividade
ping db.example.com
telnet db.example.com 5432
```

### Erro: "FATAL: remaining connection slots are reserved"

```sql
-- Aumente o limite de conexões
ALTER SYSTEM SET max_connections = 200;

-- Reinicie PostgreSQL
sudo systemctl restart postgresql
```

## 📊 Estrutura do Banco de Dados

O projeto criará automaticamente as seguintes tabelas:

```
users                    - Usuários do sistema
contacts                 - Contatos do WhatsApp
leads                    - Leads gerados
conversations            - Conversas com clientes
messages                 - Histórico de mensagens
pipelines                - Pipelines de vendas
stages                   - Estágios do Kanban
whatsappSessions         - Sessões WhatsApp
tags                     - Tags para organizar
notes                    - Notas internas
automations              - Regras de automação
aiConfigurations         - Configurações de IA
knowledgeBaseDocuments   - Base de conhecimento
auditLogs                - Logs de auditoria
```

## 📈 Performance

### Criar Índices Adicionais

```sql
-- Índices para melhor performance
CREATE INDEX idx_contacts_phone ON contacts(whatsappNumber);
CREATE INDEX idx_conversations_contact ON conversations(contactId);
CREATE INDEX idx_messages_conversation ON messages(conversationId);
CREATE INDEX idx_leads_stage ON leads(stageId);
CREATE INDEX idx_auditlogs_user ON auditLogs(userId);
```

### Monitoramento

```sql
-- Ver tamanho do banco de dados
SELECT pg_size_pretty(pg_database_size('crm_waha'));

-- Ver tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Ver conexões ativas
SELECT * FROM pg_stat_activity;

-- Ver configurações importantes
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;
```

## 🔄 Backup e Restore

### Backup Completo

```bash
# Backup com dados
pg_dump -U crm_user -h localhost crm_waha > backup.sql

# Backup apenas estrutura
pg_dump -U crm_user -h localhost --schema-only crm_waha > schema.sql

# Backup em formato binário (mais rápido)
pg_dump -U crm_user -h localhost -Fc crm_waha > backup.dump
```

### Restore

```bash
# Restaurar de arquivo SQL
psql -U crm_user -h localhost crm_waha < backup.sql

# Restaurar de arquivo binário
pg_restore -U crm_user -h localhost -d crm_waha backup.dump
```

## 🔀 Alternância entre Bancos de Dados

### De MySQL para PostgreSQL

1. Exporte dados do MySQL
2. Configure PostgreSQL
3. Importe dados
4. Atualize `CUSTOM_DB_TYPE=postgres`

### De PostgreSQL para MySQL

1. Exporte dados do PostgreSQL
2. Configure MySQL
3. Importe dados
4. Atualize `CUSTOM_DB_TYPE=mysql`

## 📚 Recursos Adicionais

- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [PostgreSQL Download](https://www.postgresql.org/download/)
- [pgAdmin - Interface Web](https://www.pgadmin.org/)
- [DBeaver - IDE SQL](https://dbeaver.io/)
- [Connection Strings](https://www.connectionstrings.com/postgresql/)

## 💬 Suporte

Se tiver dúvidas:

1. Consulte a [documentação oficial do PostgreSQL](https://www.postgresql.org/docs/)
2. Verifique os logs em `.manus-logs/devserver.log`
3. Teste a conexão manualmente:

```bash
psql -U crm_user -h localhost -d crm_waha
```

---

**Nota:** PostgreSQL é uma excelente escolha para aplicações de produção. Oferece confiabilidade, performance e recursos avançados!
