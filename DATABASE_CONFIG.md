# Configuração de Banco de Dados Customizado

Este guia explica como configurar o CRM Omnichannel WAHA para usar seu próprio banco de dados MySQL/TiDB em vez do banco de dados padrão do Manus.

## 📋 Pré-requisitos

- Um servidor MySQL 5.7+ ou TiDB
- Credenciais de acesso ao banco de dados (usuário, senha, host, porta)
- Um banco de dados criado ou vazio para usar

## 🔧 Configuração

### Opção 1: Usando o Management UI (Recomendado)

1. Acesse o painel de gerenciamento do seu projeto
2. Vá para **Settings → Secrets**
3. Procure por `DATABASE_URL` ou clique em "Add Secret"
4. Configure a variável com sua string de conexão

### Opção 2: Arquivo .env Local (Desenvolvimento)

Para desenvolvimento local, crie um arquivo `.env.local` na raiz do projeto:

```bash
# Criar arquivo
touch .env.local

# Editar com seu editor favorito
# Adicione a seguinte linha:
DATABASE_URL=mysql://usuario:senha@host:porta/banco_de_dados
```

## 📝 Formatos de String de Conexão

### MySQL Local

```
mysql://root:password@localhost:3306/crm_waha
```

### MySQL Remoto

```
mysql://usuario:senha@db.example.com:3306/crm_waha
```

### TiDB Cloud

```
mysql://usuario:senha@tidb-host.tidbcloud.com:4000/crm_waha
```

### MariaDB

```
mysql://usuario:senha@localhost:3306/crm_waha
```

## 🚀 Passos para Configurar

### 1. Criar Banco de Dados

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

### 2. Configurar Variável de Ambiente

Via Management UI:

- Settings → Secrets
- Adicione `DATABASE_URL` com sua string de conexão

### 3. Aplicar Migrações

Após configurar o banco de dados, você precisa aplicar as migrações:

1. Vá para Management UI → Database
2. Você verá as migrações pendentes
3. Clique em "Apply" ou "Run Migration"
4. As tabelas serão criadas automaticamente

### 4. Testar Conexão

Para verificar se a conexão está funcionando:

1. Faça login no aplicativo
2. Vá para qualquer página que use banco de dados (ex: Dashboard)
3. Se carregar sem erros, a conexão está OK

## 🔐 Segurança

### Boas Práticas

1. **Use senhas fortes** para o usuário do banco de dados
2. **Restrinja acesso** ao banco de dados apenas para IPs conhecidos
3. **Use SSL/TLS** para conexões remotas
4. **Não compartilhe** suas credenciais de banco de dados
5. **Faça backups** regularmente

### Exemplo com SSL (TiDB Cloud)

```
mysql://usuario:senha@tidb-host.tidbcloud.com:4000/crm_waha?sslMode=require
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

## 🐛 Troubleshooting

### Erro: "Connection refused"

- Verifique se o servidor MySQL está rodando
- Verifique o host e porta na string de conexão
- Verifique se o firewall permite conexões

### Erro: "Access denied for user"

- Verifique o usuário e senha
- Verifique as permissões do usuário
- Certifique-se de que o usuário pode acessar do host especificado

### Erro: "Unknown database"

- Verifique se o banco de dados foi criado
- Verifique o nome do banco de dados na string de conexão

### Erro: "Data truncated for column"

- Isso geralmente significa que as migrações não foram aplicadas
- Vá para Management UI → Database e aplique as migrações

## 📈 Performance

### Otimizações Recomendadas

1. **Índices**: As tabelas já têm índices otimizados
2. **Connection Pool**: O projeto usa pool de conexões automático
3. **Backup**: Configure backups automáticos no seu servidor

### Monitoramento

Para monitorar o banco de dados:

```sql
-- Ver tamanho do banco de dados
SELECT
  table_schema,
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'crm_waha'
GROUP BY table_schema;

-- Ver conexões ativas
SHOW PROCESSLIST;

-- Ver status do servidor
SHOW STATUS;
```

## 🔄 Migração de Dados

Se você tem dados em outro banco de dados:

```bash
# Exportar dados do banco antigo
mysqldump -u usuario -p banco_antigo > backup.sql

# Importar para o novo banco
mysql -u usuario -p crm_waha < backup.sql
```

## 📚 Recursos Adicionais

- [Documentação MySQL](https://dev.mysql.com/doc/)
- [Documentação TiDB](https://docs.pingcap.com/tidb/stable)
- [Drizzle ORM](https://orm.drizzle.team/)

## 💬 Suporte

Se tiver dúvidas sobre configuração de banco de dados:

1. Consulte a documentação do seu provedor de banco de dados
2. Verifique os logs em `.manus-logs/devserver.log`
3. Abra uma issue no repositório do projeto

---

**Nota**: Após alterar o `DATABASE_URL`, reinicie o servidor para que as mudanças tenham efeito.
