# Configuração de IA

O CRM suporta 5 provedores de IA para conversação automática.

## Provedores Suportados

| Provedor | Modelo Exemplo | Observação |
|----------|---------------|------------|
| **OpenAI** | gpt-4o, gpt-4o-mini | Requer API key https://platform.openai.com |
| **Claude** | claude-3-5-sonnet | Requer API key https://console.anthropic.com |
| **Gemini** | gemini-2.0-flash | Requer API key https://aistudio.google.com |
| **Ollama** | llama3, mistral | Local, gratuito https://ollama.ai |
| **OpenRouter** | openai/gpt-4o | Agregador multi-modelo https://openrouter.ai |

## Configuração

1. Acesse **Configurações IA** na sidebar
2. Selecione o provedor desejado
3. Preencha:
   - **API Key:** Chave de acesso do provedor
   - **Modelo:** Nome do modelo (ex: `gpt-4o`)
   - **System Prompt:** Instruções do sistema para a IA
   - **Temperature:** Criatividade (0-2, padrão 0.7)
   - **Max Tokens:** Tamanho máximo da resposta (padrão 2000)
4. Marque **Ativar** para usar este provedor
5. Clique **Testar Conexão** para validar

### Variáveis de Ambiente

```bash
OPENAI_API_KEY=sk-...            # OpenAI
CLAUDE_API_KEY=sk-ant-...       # Anthropic Claude
GEMINI_API_KEY=AIza...          # Google Gemini
```

## Ollama (Local/Gratuito)

O Ollama roda localmente e é gratuito:

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixar um modelo
ollama pull llama3

# O CRM acessa automaticamente em http://localhost:11434

# Para usar em Docker, use: http://host.docker.internal:11434
```

No CRM, configure:
- Provedor: `Ollama`
- API Key: `ollama` (qualquer valor)
- Modelo: `llama3` (ou outro disponível)
- Base URL: `http://localhost:11434` (ou URL do Ollama)

## Fluxo de IA

1. **Mensagem recebida** → Webhook WAHA
2. **Verificação IA** → Conversa está ativa com `aiProvider != none`?
3. **Contexto** → Carrega histórico da conversa + dados do contato/lead + base de conhecimento
4. **Handoff check** → IA detecta necessidade de atendente?
5. **Resposta** → IA gera resposta (com RAG se configurado)
6. **Envio** → Mensagem enviada via WAHA

## Detecção de Handoff

A IA detecta automaticamente quando transferir para humano. Palavras-chave detectadas:
- "falar com atendente"
- "atendente humano"
- "pessoa real"
- Reclamações e insatisfação

Quando detectado, a conversa é movida para a fila de atendimento.

## Base de Conhecimento (RAG)

1. Acesse **Base Conhecimento** na sidebar
2. Faça upload de arquivos (PDF, DOCX, TXT, CSV)
3. O sistema gera embeddings e indexa o conteúdo
4. A IA usa busca semântica para encontrar trechos relevantes
5. O contexto é incluído no prompt da IA

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "No active AI configuration" | Configure e ative um provedor em Configurações IA |
| Erro de API key | Verifique se a chave é válida e tem créditos |
| Ollama não conecta | Verifique se está rodando: `ollama list` |
| Respostas lentas | Aumente recursos ou use modelo menor (gpt-4o-mini) |
