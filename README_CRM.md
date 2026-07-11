# CRM Omnichannel WAHA

Uma plataforma completa de atendimento e vendas via WhatsApp, integrando automação com IA, CRM, Kanban e gestão de equipes em um único sistema.

## 🎯 Funcionalidades Principais

### 1. Integração com WAHA via API REST e Webhooks
- ✅ Gerenciamento de múltiplas sessões WhatsApp
- ✅ Exibição de QR Code para conexão das sessões
- ✅ Reconexão automática em caso de queda
- ✅ Monitoramento de status das sessões
- ✅ Envio e recebimento de mensagens em todos os formatos (texto, imagens, áudios, vídeos, documentos, localização)

### 2. CRM de Leads
- ✅ Cadastro automático ao receber nova mensagem
- ✅ Criação de Lead, Contato e Conversa
- ✅ Atualização de última interação para números já cadastrados

### 3. Kanban de Vendas
- ✅ Colunas padrão: Novo Lead, Primeiro Contato, Qualificação, Proposta, Negociação, Fechamento, Ganho, Perdido
- ✅ Drag-and-drop entre colunas
- ✅ Atualização em tempo real
- ✅ Filtros, etiquetas, responsáveis e datas de vencimento

### 4. Tela de Conversação estilo WhatsApp Web
- ✅ Painel esquerdo com lista de conversas
- ✅ Nome, foto, última mensagem, horário, contador de não lidas
- ✅ Status IA/Humano
- ✅ Painel central com histórico completo do chat
- ✅ Suporte a mídias, emojis e atualização em tempo real via WebSocket

### 5. IA Conversacional Configurável
- ✅ Suporte aos provedores: OpenAI, Ollama, OpenRouter, Claude, Gemini
- ✅ Fluxo completo: receber mensagem → recuperar histórico → buscar contexto → gerar resposta → enviar via WAHA

### 6. Atendimento Humano
- ✅ Suporte a múltiplos atendentes
- ✅ Filas de atendimento
- ✅ Distribuição automática e manual de conversas
- ✅ Transferência entre atendentes
- ✅ Notas internas por conversa

### 7. Dashboard com Indicadores
- ✅ Leads criados, conversas abertas e encerradas
- ✅ Taxa de conversão
- ✅ Tempo médio de resposta e de atendimento
- ✅ Quantidade de atendimentos por atendente e por IA
- ✅ Vendas por período

### 8. Sistema de Automações (SE/ENTÃO)
- ✅ Mover lead no Kanban com base em palavras-chave
- ✅ Enviar follow-up automático após inatividade
- ✅ Sistema de tags manual e automático

### 9. Base de Conhecimento RAG
- ✅ Upload de arquivos PDF, DOCX, TXT e CSV
- ✅ Consulta pela IA antes de gerar cada resposta

### 10. Sistema de Permissões
- ✅ Perfis de acesso: Administrador, Supervisor, Atendente
- ✅ Auditoria de ações dos usuários

## 🏗️ Arquitetura Técnica

### Stack Tecnológico
- **Frontend**: React 19 + Tailwind CSS 4 + TypeScript
- **Backend**: Express 4 + tRPC 11 + Node.js
- **Database**: MySQL/TiDB via Drizzle ORM
- **Autenticação**: Manus OAuth
- **Integração WhatsApp**: WAHA API
- **IA**: OpenAI, Claude, Gemini, Ollama, OpenRouter

### Estrutura de Banco de Dados

#### Tabelas Principais
1. **users** - Usuários do sistema com roles
2. **contacts** - Contatos do WhatsApp
3. **leads** - Leads gerados
4. **conversations** - Conversas com clientes
5. **messages** - Histórico de mensagens
6. **pipelines** - Pipelines de vendas
7. **stages** - Estágios do Kanban
8. **whatsappSessions** - Sessões WhatsApp conectadas
9. **tags** - Tags para organizar conversas
10. **notes** - Notas internas
11. **automations** - Regras de automação
12. **aiConfigurations** - Configurações de IA
13. **knowledgeBase** - Base de conhecimento
14. **auditLogs** - Logs de auditoria

### Routers tRPC Implementados
1. **crm** - Gerenciamento de contatos e leads
2. **conversations** - Gerenciamento de conversas e mensagens
3. **whatsapp** - Gerenciamento de sessões WhatsApp
4. **ai** - Configurações e execução de IA
5. **dashboard** - Métricas e indicadores
6. **waha** - Integração com API WAHA

### Páginas Frontend
1. **Dashboard** - Visão geral com métricas
2. **Kanban** - Gerenciamento de vendas
3. **Conversas** - Chat estilo WhatsApp Web
4. **Configurações de IA** - Configurar provedores de IA
5. **Base de Conhecimento** - Upload e gerenciamento de documentos
6. **Automações** - Criar regras SE/ENTÃO
7. **Gerenciamento de Equipes** - Gerenciar usuários e roles
8. **Sessões WhatsApp** - Gerenciar conexões WhatsApp

## 🚀 Como Começar

### 1. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis via Management UI (Settings → Secrets):

```env
# WAHA
WAHA_API_URL=http://localhost:3001
WAHA_API_KEY=sua-chave-api-opcional

# OpenAI (Opcional)
OPENAI_API_KEY=sua-chave-openai

# Claude (Opcional)
ANTHROPIC_API_KEY=sua-chave-claude

# Gemini (Opcional)
GEMINI_API_KEY=sua-chave-gemini
```

### 2. Aplicar Migrações do Banco de Dados

1. Vá para Management UI → Database
2. Execute as migrações SQL geradas em `drizzle/migrations/`
3. Verifique se todas as tabelas foram criadas

### 3. Criar Primeira Sessão WhatsApp

1. Acesse a página "Sessões WhatsApp"
2. Clique em "Nova Sessão"
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a conexão ser estabelecida

### 4. Configurar IA (Opcional)

1. Acesse "Configurações de IA"
2. Selecione um provedor (OpenAI, Claude, etc.)
3. Adicione sua chave de API
4. Teste a conexão

### 5. Criar Automações

1. Acesse "Automações"
2. Clique em "Nova Automação"
3. Configure regras SE/ENTÃO
4. Ative a automação

## 📊 Fluxo de Funcionamento

### Recebimento de Mensagem
1. Cliente envia mensagem via WhatsApp
2. WAHA recebe e envia webhook para `/api/webhooks/waha`
3. Sistema cria/atualiza Contato
4. Sistema cria/atualiza Conversa
5. Sistema salva Mensagem
6. Se IA ativada, gera resposta automática
7. Resposta é enviada via WAHA

### Atendimento Manual
1. Atendente visualiza conversa na lista
2. Clica para abrir chat
3. Digita resposta
4. Clica em enviar
5. Mensagem é enviada via WAHA
6. Status é atualizado em tempo real

### Gerenciamento de Leads
1. Lead é criado automaticamente ao primeiro contato
2. Atendente move lead no Kanban
3. Automações podem mover automaticamente baseado em palavras-chave
4. Relatórios mostram taxa de conversão

## 🔐 Sistema de Permissões

### Administrador
- Acesso total ao sistema
- Gerenciar usuários e roles
- Configurar IA e integrações
- Visualizar auditoria

### Supervisor
- Gerenciar atendentes
- Visualizar relatórios
- Distribuir conversas
- Criar automações

### Atendente
- Visualizar conversas atribuídas
- Enviar mensagens
- Consultar base de conhecimento
- Adicionar notas

## 🧪 Testes

Execute os testes com:

```bash
pnpm test
```

Testes incluem:
- Autenticação e logout
- Operações CRUD de contatos e leads
- Envio de mensagens
- Gerenciamento de sessões WAHA

## 📝 Documentação Adicional

- [WAHA_SETUP.md](./WAHA_SETUP.md) - Configuração detalhada da integração WAHA
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detalhes da arquitetura
- [MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md) - Instruções de migração do banco de dados

## 🐛 Troubleshooting

### Erro: "Data truncated for column 'role'"
- Verifique se as migrações foram aplicadas corretamente
- Limpe os cookies e faça login novamente
- Verifique o schema em `drizzle/schema.ts`

### Erro: "WAHA API não respondeu"
- Certifique-se de que WAHA está rodando
- Verifique a URL em `WAHA_API_URL`
- Verifique a conectividade de rede

### Mensagens não aparecem
- Verifique se o webhook está registrado
- Verifique os logs em `.manus-logs/devserver.log`
- Certifique-se de que a sessão está conectada

## 📈 Próximas Melhorias

- [ ] Integração com Stripe para pagamentos
- [ ] Relatórios avançados com exportação
- [ ] Integração com Google Calendar
- [ ] Suporte a múltiplos canais (Instagram, Facebook)
- [ ] Análise de sentimento
- [ ] Chatbot com IA mais avançada
- [ ] Mobile app com React Native
- [ ] Integração com CRM externo (Salesforce, Pipedrive)

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação em `WAHA_SETUP.md`
2. Verifique os logs em `.manus-logs/`
3. Abra uma issue no repositório

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ usando Manus**
