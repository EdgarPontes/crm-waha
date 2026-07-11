# CRM Omnichannel WAHA - TODO

## Fase 1: Fundação e Schema

- [x] Criar schema Drizzle completo com todas as tabelas
- [x] Gerar migrações SQL via drizzle-kit
- [ ] Executar migrações no banco de dados (via Management UI)
- [x] Implementar helpers de banco de dados
- [x] Implementar procedures tRPC para autenticação
- [x] Implementar procedures tRPC para autorização por role
- [x] Criar testes unitários para autenticação

## Fase 2: Implementação de Routers tRPC

- [x] Criar router tRPC para CRM (contatos e leads)
- [x] Criar router tRPC para conversas e mensagens
- [x] Criar router tRPC para WhatsApp e sessões
- [x] Criar router tRPC para IA e configurações
- [x] Criar router tRPC para dashboard e métricas
- [x] Integrar todos os routers ao appRouter principal

## Fase 3: Implementação de Páginas Frontend

- [x] Criar página Dashboard com métricas e gráficos
- [x] Criar página Kanban com drag-and-drop
- [x] Criar página de Conversas estilo WhatsApp Web
- [x] Criar página de Configurações de IA
- [x] Criar página de Base de Conhecimento
- [x] Criar página de Automações
- [x] Criar página de Gerenciamento de Equipes
- [x] Criar página de Sessões WhatsApp

## Fase 4: Integração WAHA

- [x] Implementar client WAHA para gerenciar sessões
- [x] Criar router tRPC para WAHA
- [x] Criar endpoints para listar, criar, desconectar e deletar sessões
- [x] Implementar envio de mensagens (texto e mídia)
- [x] Implementar obtenção de QR code
- [ ] Implementar webhook para receber eventos WAHA
- [ ] Implementar reconexão automática de sessões
- [ ] Sincronizar mensagens recebidas com banco de dados
- [ ] Atualizar status de mensagens em tempo real
- [ ] Criar monitoramento de status das sessões
- [ ] Implementar envio de mensagens de texto
- [ ] Implementar envio de imagens
- [ ] Implementar envio de áudios
- [ ] Implementar envio de vídeos
- [ ] Implementar envio de documentos
- [ ] Implementar envio de localização
- [ ] Criar testes para integração WAHA

## Fase 3: CRM Base - Contatos e Leads

- [ ] Implementar cadastro automático de contatos ao receber mensagem
- [ ] Implementar cadastro automático de leads
- [ ] Implementar criação de conversa automática
- [ ] Criar procedures para listar contatos
- [ ] Criar procedures para listar leads
- [ ] Criar procedures para atualizar contatos
- [ ] Criar procedures para atualizar leads
- [ ] Implementar busca e filtros de contatos
- [ ] Implementar busca e filtros de leads
- [ ] Criar testes para CRM base

## Fase 4: Tela de Conversação

- [ ] Criar layout base da tela de conversação (painel esquerdo + central)
- [ ] Implementar lista de conversas no painel esquerdo
- [ ] Exibir última mensagem, horário e contador de não lidas
- [ ] Exibir status IA/Humano na lista de conversas
- [ ] Implementar histórico de mensagens no painel central
- [ ] Exibir mídias (imagens, áudios, vídeos, documentos)
- [ ] Implementar suporte a emojis
- [ ] Implementar atualização em tempo real via WebSocket
- [ ] Implementar scroll infinito para histórico
- [ ] Criar componentes de mensagem (enviada, recebida, status)
- [ ] Implementar indicador de digitação
- [ ] Criar testes para tela de conversação

## Fase 5: Kanban de Vendas

- [ ] Criar schema de Pipelines e Stages
- [ ] Implementar colunas padrão do Kanban (8 colunas)
- [ ] Criar componente visual do Kanban
- [ ] Implementar drag-and-drop entre colunas
- [ ] Implementar atualização de stageId ao mover lead
- [ ] Implementar atualização em tempo real do Kanban
- [ ] Implementar filtros no Kanban
- [ ] Implementar busca de leads no Kanban
- [ ] Adicionar etiquetas aos cards do Kanban
- [ ] Adicionar responsável aos cards do Kanban
- [ ] Adicionar datas de vencimento aos cards
- [ ] Implementar visualização de lead ao clicar no card
- [ ] Registrar movimentações em AuditLogs
- [ ] Criar testes para Kanban

## Fase 6: IA Conversacional

- [ ] Criar schema para AIConfigurations
- [ ] Implementar painel de configuração de IA
- [ ] Implementar suporte para OpenAI
- [ ] Implementar suporte para Claude
- [ ] Implementar suporte para Gemini
- [ ] Implementar suporte para Ollama
- [ ] Implementar suporte para OpenRouter
- [ ] Implementar criptografia de API keys
- [ ] Implementar teste de conexão com IA
- [ ] Implementar fluxo de recebimento de mensagem → IA
- [ ] Implementar recuperação de histórico para contexto
- [ ] Implementar busca de contexto do cliente
- [ ] Implementar envio de resposta via WAHA
- [ ] Implementar detecção de handoff (cliente pediu humano, reclamação, etc)
- [ ] Criar testes para IA

## Fase 7: Base de Conhecimento (RAG)

- [ ] Criar schema para KnowledgeBaseDocuments
- [ ] Implementar upload de arquivos PDF
- [ ] Implementar upload de arquivos DOCX
- [ ] Implementar upload de arquivos TXT
- [ ] Implementar upload de arquivos CSV
- [ ] Implementar extração de texto de PDFs
- [ ] Implementar extração de texto de DOCX
- [ ] Implementar sistema de embeddings para RAG
- [ ] Implementar busca semântica na base de conhecimento
- [ ] Integrar RAG com IA conversacional
- [ ] Implementar interface de gerenciamento de documentos
- [ ] Criar testes para RAG

## Fase 8: Atendimento Humano

- [ ] Criar schema para fila de atendimento
- [ ] Implementar status "Aguardando Atendente"
- [ ] Implementar fila de atendimento
- [ ] Implementar distribuição automática de conversas
- [ ] Implementar distribuição manual de conversas
- [ ] Implementar transferência entre atendentes
- [ ] Implementar notas internas por conversa
- [ ] Implementar visualização de fila para supervisor
- [ ] Implementar reativação de IA pelo atendente
- [ ] Implementar encerramento de conversa
- [ ] Criar testes para atendimento humano

## Fase 9: Sistema de Automações

- [ ] Criar schema para Automations
- [ ] Implementar painel de criação de automações
- [ ] Implementar trigger: mensagem contém palavra-chave
- [ ] Implementar trigger: cliente respondeu "sim"
- [ ] Implementar trigger: inatividade de X horas
- [ ] Implementar ação: mover lead no Kanban
- [ ] Implementar ação: enviar follow-up automático
- [ ] Implementar ação: adicionar tag
- [ ] Implementar ação: atribuir a atendente
- [ ] Implementar engine de execução de automações
- [ ] Implementar testes para automações

## Fase 10: Sistema de Tags

- [ ] Criar schema para Tags
- [ ] Implementar CRUD de tags
- [ ] Implementar aplicação manual de tags
- [ ] Implementar aplicação automática de tags (via automações)
- [ ] Implementar filtro por tags no Kanban
- [ ] Implementar filtro por tags na lista de conversas
- [ ] Criar testes para tags

## Fase 11: Dashboard e Métricas

- [ ] Implementar cálculo de leads criados
- [ ] Implementar cálculo de conversas abertas
- [ ] Implementar cálculo de conversas encerradas
- [ ] Implementar cálculo de taxa de conversão
- [ ] Implementar cálculo de tempo médio de resposta
- [ ] Implementar cálculo de tempo médio de atendimento
- [ ] Implementar cálculo de quantidade por atendente
- [ ] Implementar cálculo de quantidade por IA
- [ ] Implementar cálculo de vendas por período
- [ ] Criar componentes visuais do dashboard
- [ ] Implementar gráficos de métricas
- [ ] Criar testes para dashboard

## Fase 12: Auditoria e Segurança

- [ ] Criar schema para AuditLogs
- [ ] Implementar logging de login
- [ ] Implementar logging de logout
- [ ] Implementar logging de alterações
- [ ] Implementar logging de transferências
- [ ] Implementar logging de movimentações Kanban
- [ ] Implementar logging de mensagens enviadas
- [ ] Implementar logging de mensagens recebidas
- [ ] Criar interface de visualização de auditoria
- [ ] Implementar filtros em auditoria
- [ ] Criar testes para auditoria

## Fase 13: Gerenciamento de Usuários

- [ ] Implementar CRUD de usuários (admin only)
- [ ] Implementar atribuição de roles (Administrador, Supervisor, Atendente)
- [ ] Implementar interface de gerenciamento de usuários
- [ ] Implementar validação de permissões por role
- [ ] Criar testes para gerenciamento de usuários

## Fase 14: Testes e Otimizações

- [ ] Executar testes unitários completos
- [ ] Executar testes de integração
- [ ] Otimizar queries do banco de dados
- [ ] Adicionar índices necessários
- [ ] Implementar caching onde necessário
- [ ] Testar performance com múltiplas conversas
- [ ] Testar performance com múltiplas sessões WhatsApp
- [ ] Testar WebSocket com múltiplos usuários

## Fase 15: Documentação e Deploy

- [ ] Documentar API com Swagger
- [ ] Documentar fluxos principais
- [ ] Documentar configuração de WAHA
- [ ] Documentar configuração de IA
- [ ] Criar guia de deploy
- [ ] Criar guia de instalação
- [ ] Preparar Docker Compose
- [ ] Testar deploy em ambiente de produção
