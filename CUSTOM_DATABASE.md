# Configuração de Banco de Dados Customizado

Este guia explica como configurar o CRM Omnichannel WAHA para usar seu próprio banco de dados (MySQL, PostgreSQL, TiDB, MariaDB) em vez do banco de dados padrão do Manus.

## 🎯 Bancos de Dados Suportados

- ✅ **MySQL** 5.7+
- ✅ **MariaDB** 10.3+
- ✅ **TiDB** (compatível com MySQL)
- ✅ **PostgreSQL** 12+

## 📋 Pré-requisitos

- Um servidor de banco de dados instalado e rodando
- Credenciais de acesso (usuário, senha, host, porta)
- Um banco de dados criado ou vazio para usar

## 🔧 Configuração via Management UI

### Opção 1: Usando String de Conexão Completa (Recomendado)

1. Acesse o painel de gerenciamento do seu projeto
2. Vá para **Settings → Secrets**
3. Clique em "Add Secret"
4. Adicione as seguintes variáveis:

**Variável 1:** `CUSTOM_DB_TYPE`
**Valor:** `mysql` ou `postgres`

**Variável 2:** `CUSTOM_DB_URL`
**Valor:** String de conexão do seu banco de dados

### Opção 2: Usando Componentes Individuais

Se preferir configurar cada componente separadamente:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `CUSTOM_DB_TYPE` | Tipo de banco de dados | `mysql` ou `postgres` |
| `CUSTOM_DB_HOST` | Host do banco de dados | `localhost` ou `db.example.com` |
| `CUSTOM_DB_PORT` | Porta do banco de dados | `3306` (MySQL) ou `5432` (PostgreSQL) |
| `CUSTOM_DB_USER` | Usuário do banco de dados | `crm_user` |
| `CUSTOM_DB_PASSWORD` | Senha do banco de dados | `sua_senha_segura` |
| `CUSTOM_DB_NAME` | Nome do banco de dados | `crm_waha` |

## 📝 Exemplos de Strings de Conexão

### MySQL Local

```
CUSTOM_DB_TYPE=mysql
CUSTOM_DB_URL=mysql://root:password@localhost:3306/crm_waha
```

### MySQL Remoto

```
CUSTOM_DB_TYPE=mysql
CUSTOM_DB_URL=mysql://crm_user:senha_segura@db.example.com:3306/crm_waha
```

### TiDB Cloud

```
CUSTOM_DB_TYPE=mysql
CUSTOM_DB_URL=mysql://usuario:senha@tidb-host.tidbcloud.com:4000/crm_waha
```

### PostgreSQL Local

```
CUSTOM_DB_TYPE=postgres
CUSTOM_DB_URL=postgresql://postgres:password@localhost:5432/crm_waha
```

### PostgreSQL Remoto

```
CUSTOM_DB_TYPE=postgres
CUSTOM_DB_URL=postgresql://crm_user:senha_segura@db.example.com:5432/crm_waha
```

### AWS RDS MySQL

```
CUSTOM_DB_TYPE=mysql
CUSTOM_DB_URL=mysql://admin:senha@crm-db.xxxxx.rds.amazonaws.com:3306/crm_waha
```

### AWS RDS PostgreSQL

```
CUSTOM_DB_TYPE=postgres
CUSTOM_DB_URL=postgresql://postgres:senha@crm-db.xxxxx.rds.amazonaws.com:5432/crm_waha
```

### Google Cloud SQL MySQL

```
CUSTOM_DB_TYPE=mysql
CUSTOM_DB_URL=mysql://root:senha@35.184.123.45:3306/crm_waha
```

### Google Cloud SQL PostgreSQL

```
CUSTOM_DB_TYPE=postgres
CUSTOM_DB_URL=postgresql://postgres:senha@35.184.123.45:5432/crm_waha
```

### Azure Database for PostgreSQL

```
CUSTOM_DB_TYPE=postgres
CUSTOM_DB_URL=postgresql://admin@servername:password@servername.postgres.database.azure.com:5432/crm_waha
```

## 🚀 Passos para Configurar

### 1. Criar Banco de Dados

#### MySQL/MariaDB

```sql
-- Conecte ao seu servidor MySQL
mysql -u root -p

-- Crie um novo banco de dados
CREATE DATABASE crm_waha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crie um usuário (opcional, mas recomendado)
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'senha_segura';
GRANT ALL PRIVILEGES ON crm_waha.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
```

#### PostgreSQL

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
```

### 2. Configurar Variáveis de Ambiente

1. Acesse o Management UI
2. Vá para **Settings → Secrets**
3. Adicione `CUSTOM_DB_TYPE` e `CUSTOM_DB_URL` (ou os componentes individuais)
4. Clique em "Save"

### 3. Reiniciar o Servidor

O servidor será reiniciado automaticamente após salvar as variáveis. Se não reiniciar:

1. Vá para **Settings → General**
2. Clique em "Restart Server"

### 4. Aplicar Migrações

Após reiniciar, as tabelas do banco de dados serão criadas automaticamente na primeira conexão.

Para verificar manualmente:

**MySQL:**
```bash
mysql -u crm_user -p crm_waha
SHOW TABLES;
```

**PostgreSQL:**
```bash
psql -U crm_user -d crm_waha
\dt
```

Você deve ver tabelas como: `users`, `contacts`, `leads`, `conversations`, etc.

### 5. Testar Conexão

1. Faça login no aplicativo
2. Vá para qualquer página que use banco de dados (ex: Dashboard)
3. Se carregar sem erros, a conexão está OK

## 🔐 Segurança

### Boas Práticas

1. **Use senhas fortes** para o usuário do banco de dados
   ```bash
   # Gere uma senha segura
   openssl rand -base64 32
   ```

2. **Restrinja acesso** ao banco de dados apenas para IPs conhecidos

3. **Use SSL/TLS** para conexões remotas
   ```
   mysql://usuario:senha@host:3306/banco?sslMode=require
   postgresql://usuario:senha@host:5432/banco?sslmode=require
   ```

4. **Não compartilhe** suas credenciais de banco de dados

5. **Faça backups** regularmente

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

## 🐛 Troubleshooting

### Erro: "Connection refused"

**Causa:** O servidor de banco de dados não está acessível

**Solução:**
- Verifique se o servidor está rodando
- Verifique o host e porta
- Verifique o firewall

### Erro: "Access denied for user" (MySQL)

**Causa:** Credenciais incorretas ou permissões insuficientes

**Solução:**
```sql
-- Verifique o usuário
SELECT user, host FROM mysql.user WHERE user='crm_user';

-- Redefina a senha
ALTER USER 'crm_user'@'localhost' IDENTIFIED BY 'nova_senha';

-- Conceda permissões novamente
GRANT ALL PRIVILEGES ON crm_waha.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
```

### Erro: "FATAL: role does not exist" (PostgreSQL)

**Causa:** Usuário não existe

**Solução:**
```sql
-- Crie o usuário
CREATE USER crm_user WITH PASSWORD 'senha_segura';
GRANT ALL PRIVILEGES ON DATABASE crm_waha TO crm_user;
```

### Erro: "Unknown database"

**Causa:** O banco de dados não foi criado

**Solução:**
```sql
-- MySQL
CREATE DATABASE crm_waha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- PostgreSQL
CREATE DATABASE crm_waha;
```

### Erro: "Data truncated for column"

**Causa:** As migrações não foram aplicadas ou há incompatibilidade de schema

**Solução:**
1. Verifique se as tabelas foram criadas
2. Reinicie o servidor
3. Verifique os logs em `.manus-logs/devserver.log`

## 📈 Performance

### MySQL - Criar Índices Adicionais

```sql
CREATE INDEX idx_contacts_phone ON contacts(whatsappNumber);
CREATE INDEX idx_conversations_contact ON conversations(contactId);
CREATE INDEX idx_messages_conversation ON messages(conversationId);
CREATE INDEX idx_leads_stage ON leads(stageId);
```

### PostgreSQL - Criar Índices Adicionais

```sql
CREATE INDEX idx_contacts_phone ON contacts(whatsappNumber);
CREATE INDEX idx_conversations_contact ON conversations(contactId);
CREATE INDEX idx_messages_conversation ON messages(conversationId);
CREATE INDEX idx_leads_stage ON leads(stageId);
```

## 🔄 Backup e Restore

### MySQL

```bash
# Backup
mysqldump -u usuario -p banco > backup.sql

# Restore
mysql -u usuario -p banco < backup.sql
```

### PostgreSQL

```bash
# Backup
pg_dump -U usuario -h host banco > backup.sql

# Restore
psql -U usuario -h host banco < backup.sql
```

## 🔀 Alternância entre Bancos de Dados

Para alternar entre diferentes bancos de dados:

1. Configure as novas variáveis de ambiente
2. Reinicie o servidor
3. O projeto automaticamente usará o novo banco de dados

## 📚 Recursos Adicionais

- [Documentação MySQL](https://dev.mysql.com/doc/)
- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [Documentação MariaDB](https://mariadb.com/docs/)
- [Documentação TiDB](https://docs.pingcap.com/tidb/stable)
- [Drizzle ORM](https://orm.drizzle.team/)

## 💬 Suporte

Se tiver dúvidas:

1. Consulte a documentação do seu banco de dados
2. Verifique os logs em `.manus-logs/devserver.log`
3. Teste a conexão manualmente com o cliente apropriado

---

**Nota:** Após alterar as variáveis de ambiente, o servidor será reiniciado automaticamente. Aguarde alguns minutos para que as mudanças tenham efeito.
