# Configuração WAHA

O [WAHA](https://waha.devlike.pro/) (WhatsApp HTTP API) é o componente responsável pela comunicação com o WhatsApp.

## Instalação do WAHA

### Docker (Recomendado)

```bash
docker run -d \
  --name waha \
  -p 3001:3000 \
  -e WAHA_MEDIA_STORAGE=/waha-media \
  -v waha-media:/waha-media \
  devlikeapro/waha:latest
```

### NPM

```bash
npx @devlikeapro/waha
```

## Configuração no CRM

1. Acesse o menu **Config. WAHA** na sidebar
2. Clique para criar uma nova configuração
3. Preencha:
   - **Nome:** Identificador (ex: `Servidor Principal`)
   - **Base URL:** URL do WAHA (ex: `http://localhost:3001` ou `http://waha:3000` no Docker)
   - **API Key:** Chave de API (opcional, se configurada no WAHA)

### Variáveis de Ambiente

```bash
WAHA_API_URL=http://localhost:3001    # URL da API WAHA
WAHA_API_KEY=sua-chave-api             # Chave opcional
```

## Sessões WhatsApp

### Criar Sessão

1. Acesse **WhatsApp** na sidebar
2. Clique em **Nova Sessão**
3. Dê um nome para a sessão (sem espaços, ex: `vendas`, `suporte`)
4. Escaneie o QR code com o WhatsApp do celular

### Status das Sessões

| Status | Significado |
|--------|------------|
| `disconnected` | Sessão não conectada |
| `connecting` | Conectando ao WhatsApp |
| `connected` | Sessão ativa e funcionando |
| `error` | Erro na conexão |

### Reconexão Automática

O CRM monitora as sessões WAHA a cada 30 segundos via `startSessionMonitor()`. Sessões desconectadas são automaticamente reconectadas.

## Webhook

O CRM registra automaticamente o webhook do WAHA para URL:

```
{app_url}/api/waha/webhook
```

O webhook é registrado ao criar cada sessão. Eventos recebidos incluem:
- Mensagens recebidas (texto, imagem, áudio, vídeo, documento, localização)
- Status de mensagens (sent, delivered, read)
- Solicitações de handoff (atendimento humano)
- Status de sessão

## Envio de Mensagens

### Via API WAHA (direto)

```bash
# Enviar texto
curl -X POST http://localhost:3001/api/sendText \
  -H "Content-Type: application/json" \
  -d '{"session":"vendas","chatId":"5511999999999@c.us","text":"Olá!"}'

# Enviar imagem
curl -X POST http://localhost:3001/api/sendImage \
  -H "Content-Type: application/json" \
  -d '{"session":"vendas","chatId":"5511999999999@c.us","file":{"url":"https://..."},"caption":"Imagem"}'
```

### Via CRM (tRPC)

As mensagens são enviadas automaticamente pelo CRM através da interface de conversas ou via automações.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| QR Code não aparece | Verifique se o WAHA está rodando e acessível |
| Sessão desconecta | Verifique se o WhatsApp Web está ativo no celular |
| Mensagens não chegam | Verifique logs do WAHA e do CRM |
| Webhook não recebe | Verifique se a URL do CRM é acessível do WAHA |

## Referência

- [Documentação WAHA](https://waha.devlike.pro/docs/overview/introduction/)
- [WAHA GitHub](https://github.com/devlikeapro/waha)
