export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "CRM Omnichannel WAHA API",
    version: "1.0.0",
    description: `API completa do CRM Omnichannel integrado com WhatsApp via WAHA e múltiplos provedores de IA.

**Autenticação:** Todas as chamadas à API (exceto login/register) requerem autenticação via cookie JWT ou header Authorization: Bearer {token}.

**Formato tRPC:** As requisições seguem o padrão JSON-RPC 2.0 via POST /api/trpc/{procedure}.
- Query: POST /api/trpc/{namespace}.{procedure}?input={json}
- Mutation: POST /api/trpc/{namespace}.{procedure} com body JSON`,
    contact: {
      name: "Suporte CRM WAHA",
    },
  },
  servers: [
    { url: "http://localhost:3000", description: "Desenvolvimento local" },
    { url: "http://localhost:9000", description: "Docker Compose" },
  ],
  paths: {
    "/api/trpc/auth.login": {
      post: {
        tags: ["Autenticação"],
        summary: "Login do usuário",
        description: "Autentica o usuário e retorna token JWT no cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@exemplo.com" },
                  password: { type: "string", minLength: 1, example: "senha123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login bem-sucedido",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        email: { type: "string" },
                        name: { type: "string" },
                        role: { type: "string", enum: ["Administrador", "Supervisor", "Atendente"] },
                        emailVerified: { type: "boolean" },
                      },
                    },
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Credenciais inválidas" },
        },
      },
    },
    "/api/trpc/auth.logout": {
      post: {
        tags: ["Autenticação"],
        summary: "Logout do usuário",
        description: "Remove o cookie de autenticação.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Logout bem-sucedido",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } },
          },
        },
      },
    },
    "/api/trpc/auth.me": {
      get: {
        tags: ["Autenticação"],
        summary: "Obter usuário atual",
        description: "Retorna dados do usuário logado a partir do cookie JWT.",
        responses: {
          "200": {
            description: "Usuário autenticado",
            content: { "application/json": { schema: { type: "object", properties: { id: { type: "integer" }, email: { type: "string" }, name: { type: "string" }, role: { type: "string" }, emailVerified: { type: "boolean" } } } } },
          },
        },
      },
    },
    "/api/trpc/auth.register": {
      post: {
        tags: ["Autenticação"],
        summary: "Registrar novo usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string", minLength: 2 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Usuário registrado com sucesso" },
          "400": { description: "Email já existe ou dados inválidos" },
        },
      },
    },

    "/api/trpc/dashboard.metrics": {
      get: {
        tags: ["Dashboard"],
        summary: "Métricas do dashboard",
        description: "Retorna KPIs: conversas (ativas/aguardando/encerradas), leads (total/ganhos/perdidos/taxa), tempo médio de resposta e atendimento.",
        parameters: [
          { name: "input", in: "query", schema: { type: "string" }, description: "JSON: {\"startDate\":\"ISO\",\"endDate\":\"ISO\"}", example: "{\"startDate\":\"2025-01-01\"}" },
        ],
        responses: {
          "200": {
            description: "Métricas do dashboard",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
    "/api/trpc/dashboard.agentMetrics": {
      get: {
        tags: ["Dashboard"],
        summary: "Métricas por atendente",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, description: "Filtro opcional de data" }],
        responses: { "200": { description: "Lista de métricas por agente" } },
      },
    },
    "/api/trpc/dashboard.aiMetrics": {
      get: {
        tags: ["Dashboard"],
        summary: "Métricas de IA",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, description: "Filtro opcional de data" }],
        responses: { "200": { description: "Métricas de processamento IA" } },
      },
    },
    "/api/trpc/dashboard.salesByPeriod": {
      get: {
        tags: ["Dashboard"],
        summary: "Vendas por período",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, description: "JSON: {\"startDate\":\"ISO\",\"endDate\":\"ISO\",\"groupBy\":\"day|week|month\"}" }],
        responses: { "200": { description: "Time-series de vendas" } },
      },
    },

    "/api/trpc/crm.listPipelines": {
      get: {
        tags: ["CRM - Pipelines"],
        summary: "Listar pipelines",
        responses: { "200": { description: "Lista de pipelines" } },
      },
    },
    "/api/trpc/crm.listLeadsByPipeline?input={\"pipelineId\":1}": {
      get: {
        tags: ["CRM - Leads"],
        summary: "Listar leads do pipeline",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, example: '{"pipelineId":1}' }],
        responses: { "200": { description: "Lista de leads" } },
      },
    },
    "/api/trpc/crm.createLead": {
      post: {
        tags: ["CRM - Leads"],
        summary: "Criar lead",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["pipelineId", "stageId", "name"],
                properties: {
                  pipelineId: { type: "integer" },
                  stageId: { type: "integer" },
                  name: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Lead criado" } },
      },
    },
    "/api/trpc/crm.moveLeadToStage": {
      post: {
        tags: ["CRM - Leads"],
        summary: "Mover lead entre estágios",
        requestBody: {
          content: { "application/json": { schema: { type: "object", required: ["leadId", "stageId"], properties: { leadId: { type: "integer" }, stageId: { type: "integer" } } } } },
        },
        responses: { "200": { description: "Lead movido" } },
      },
    },
    "/api/trpc/crm.listContacts": {
      get: {
        tags: ["CRM - Contatos"],
        summary: "Listar contatos",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, description: 'JSON: {"limit":50,"offset":0}' }],
        responses: { "200": { description: "Lista de contatos" } },
      },
    },
    "/api/trpc/crm.createContact": {
      post: {
        tags: ["CRM - Contatos"],
        summary: "Criar contato",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "whatsappNumber"],
                properties: {
                  name: { type: "string" },
                  whatsappNumber: { type: "string", example: "5511999999999" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Contato criado" } },
      },
    },

    "/api/trpc/conversations.list": {
      get: {
        tags: ["Conversas"],
        summary: "Listar conversas",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, description: 'JSON: {"status":"active"|"waiting_human"|"closed","tag":"string","limit":50,"offset":0}' }],
        responses: { "200": { description: "Lista de conversas com contato associado" } },
      },
    },
    "/api/trpc/conversations.get": {
      get: {
        tags: ["Conversas"],
        summary: "Obter conversa completa",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, example: '{"id":1}' }],
        responses: { "200": { description: "Conversa com contato, mensagens e notas" } },
      },
    },
    "/api/trpc/conversations.messages.send": {
      post: {
        tags: ["Conversas"],
        summary: "Enviar mensagem",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["conversationId", "type"],
                properties: {
                  conversationId: { type: "integer" },
                  type: { type: "string", enum: ["text", "image", "audio", "video", "document", "location"] },
                  content: { type: "string" },
                  mediaUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Mensagem enviada via WAHA" } },
      },
    },
    "/api/trpc/conversations.notes.create": {
      post: {
        tags: ["Conversas"],
        summary: "Criar nota interna",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["conversationId", "content"],
                properties: { conversationId: { type: "integer" }, content: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Nota criada" } },
      },
    },

    "/api/trpc/whatsapp.sessions.list": {
      get: {
        tags: ["WhatsApp"],
        summary: "Listar sessões WhatsApp",
        responses: { "200": { description: "Lista de sessões" } },
      },
    },
    "/api/trpc/whatsapp.sessions.create": {
      post: {
        tags: ["WhatsApp"],
        summary: "Criar sessão WhatsApp (Admin)",
        description: "Cria uma nova sessão no WAHA. Retorna QR code para pareamento.",
        requestBody: {
          content: { "application/json": { schema: { type: "object", required: ["sessionName"], properties: { sessionName: { type: "string" } } } } },
        },
        responses: { "200": { description: "Sessão criada" } },
      },
    },
    "/api/trpc/whatsapp.messages.sendText": {
      post: {
        tags: ["WhatsApp"],
        summary: "Enviar mensagem de texto",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sessionName", "phoneNumber", "text"],
                properties: {
                  sessionName: { type: "string" },
                  phoneNumber: { type: "string", example: "5511999999999" },
                  text: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Mensagem enviada" } },
      },
    },
    "/api/trpc/whatsapp.messages.sendMedia": {
      post: {
        tags: ["WhatsApp"],
        summary: "Enviar mídia (imagem/áudio/vídeo/documento)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sessionName", "phoneNumber", "mediaUrl", "mediaType"],
                properties: {
                  sessionName: { type: "string" },
                  phoneNumber: { type: "string" },
                  mediaUrl: { type: "string" },
                  mediaType: { type: "string", enum: ["image", "audio", "video", "document"] },
                  caption: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Mídia enviada" } },
      },
    },

    "/api/trpc/ai.config.getActive": {
      get: {
        tags: ["IA"],
        summary: "Obter configuração IA ativa",
        responses: { "200": { description: "Configuração ativa" } },
      },
    },
    "/api/trpc/ai.config.update": {
      post: {
        tags: ["IA"],
        summary: "Atualizar/configurar IA (Admin)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["provider", "apiKey", "model"],
                properties: {
                  provider: { type: "string", enum: ["openai", "claude", "gemini", "ollama", "openrouter"] },
                  apiKey: { type: "string" },
                  model: { type: "string", example: "gpt-4o" },
                  systemPrompt: { type: "string" },
                  temperature: { type: "number", minimum: 0, maximum: 2, default: 0.7 },
                  maxTokens: { type: "integer", default: 2000 },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Configuração salva" } },
      },
    },
    "/api/trpc/ai.knowledgeBase.search": {
      post: {
        tags: ["IA - Base de Conhecimento"],
        summary: "Buscar na base de conhecimento (RAG)",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["query"], properties: { query: { type: "string" }, limit: { type: "integer", default: 5 } } },
            },
          },
        },
        responses: { "200": { description: "Resultados da busca semântica" } },
      },
    },

    "/api/trpc/attendance.enqueue": {
      post: {
        tags: ["Atendimento"],
        summary: "Adicionar conversa à fila de atendimento",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["conversationId", "contactId"],
                properties: { conversationId: { type: "integer" }, contactId: { type: "integer" }, priority: { type: "integer", default: 0 } },
              },
            },
          },
        },
        responses: { "200": { description: "Conversa enfileirada" } },
      },
    },
    "/api/trpc/attendance.assign": {
      post: {
        tags: ["Atendimento"],
        summary: "Atribuir conversa a atendente",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["queueId", "userId"], properties: { queueId: { type: "integer" }, userId: { type: "integer" } } },
            },
          },
        },
        responses: { "200": { description: "Atendente atribuído" } },
      },
    },
    "/api/trpc/attendance.getStats": {
      get: {
        tags: ["Atendimento"],
        summary: "Estatísticas da fila",
        responses: { "200": { description: "Total, waiting, assigned, inProgress, avgWaitTimeMs" } },
      },
    },

    "/api/trpc/automation.create": {
      post: {
        tags: ["Automações"],
        summary: "Criar automação (Admin)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "trigger", "triggerValue", "action"],
                properties: {
                  name: { type: "string" },
                  trigger: { type: "string", enum: ["message_contains", "response_yes", "inactivity_hours"] },
                  triggerValue: { type: "string" },
                  action: { type: "string", enum: ["move_stage", "send_message", "add_tag", "assign_user"] },
                  actionValue: { type: "object" },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Automação criada" } },
      },
    },

    "/api/trpc/tags.create": {
      post: {
        tags: ["Tags"],
        summary: "Criar tag (Admin)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" }, color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$", default: "#3b82f6" } },
              },
            },
          },
        },
        responses: { "200": { description: "Tag criada" } },
      },
    },

    "/api/trpc/users.list": {
      get: {
        tags: ["Usuários"],
        summary: "Listar usuários",
        responses: { "200": { description: "Lista de usuários" } },
      },
    },
    "/api/trpc/users.create": {
      post: {
        tags: ["Usuários"],
        summary: "Criar usuário (Admin)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                  role: { type: "string", enum: ["Administrador", "Supervisor", "Atendente"], default: "Atendente" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Usuário criado" } },
      },
    },

    "/api/trpc/audit.list": {
      get: {
        tags: ["Auditoria"],
        summary: "Listar logs de auditoria (Supervisor/Admin)",
        parameters: [{ name: "input", in: "query", schema: { type: "string" }, description: 'JSON: {"limit":50,"offset":0,"userId":1,"action":"login","entityType":"user","startDate":"ISO","endDate":"ISO"}' }],
        responses: { "200": { description: "Logs paginados com total" } },
      },
    },

    "/api/waha/webhook": {
      post: {
        tags: ["WAHA Webhook"],
        summary: "Receber eventos WAHA",
        description: "Endpoint usado pelo WAHA para enviar eventos de mensagens e status de sessão. Chamado automaticamente pelo WAHA.",
        requestBody: {
          content: { "application/json": { schema: { type: "object", description: "Payload do WAHA com session, payload, event type" } } },
        },
        responses: { "200": { description: "Evento processado" } },
      },
    },

    "/ws": {
      get: {
        tags: ["WebSocket"],
        summary: "Conexão WebSocket para tempo real",
        description: `Protocolo de mensagens WebSocket:
- **auth:** \`{"type":"auth","userId":1,"conversationId":1}\`
- **join_conversation:** \`{"type":"join_conversation","conversationId":1}\`
- **typing:** \`{"type":"typing","conversationId":1}\``,
        responses: { "101": { description: "Upgrade para WebSocket" } },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "auth_token",
        description: "Cookie JWT de autenticação",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token JWT para autenticação",
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
};
