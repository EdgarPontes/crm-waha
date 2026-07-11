# Instruções de Migração do Banco de Dados

## Status Atual

O schema Drizzle foi atualizado com todas as tabelas necessárias para o CRM Omnichannel. A migração SQL foi gerada em `drizzle/0001_mighty_stick.sql`.

## Como Aplicar as Migrações

### Opção 1: Via Interface Manus (Recomendado)

1. Acesse o painel de gerenciamento do projeto Manus
2. Vá para a aba **Database** no Management UI
3. Clique em **Run Migration**
4. Cole o conteúdo do arquivo `drizzle/0001_mighty_stick.sql`
5. Clique em **Execute**

### Opção 2: Via SQL Direto

Se você tiver acesso direto ao banco PostgreSQL, execute o arquivo de migração:

```bash
psql -U user -d database < drizzle/0001_mighty_stick.sql
```

## Tabelas Criadas

A migração cria as seguintes tabelas:

- **users** - Usuários do sistema (modificação da tabela existente)
- **contacts** - Contatos do CRM
- **leads** - Oportunidades de vendas
- **conversations** - Conversas com contatos
- **messages** - Mensagens das conversas
- **pipelines** - Funis de vendas
- **stages** - Colunas do Kanban
- **tags** - Etiquetas para leads
- **notes** - Notas internas das conversas
- **whatsappSessions** - Sessões WAHA
- **aiConfigurations** - Configurações de IA
- **knowledgeBaseDocuments** - Base de conhecimento
- **automations** - Regras de automação
- **auditLogs** - Logs de auditoria

## Alterações na Tabela Users

A coluna `role` foi modificada para usar os valores:
- `Administrador` (antes era `admin`)
- `Supervisor`
- `Atendente` (antes era `user`)

## Próximos Passos

Após aplicar as migrações:

1. Criar um pipeline padrão com as 8 colunas do Kanban
2. Implementar os procedures tRPC para CRUD de dados
3. Construir a interface do frontend
