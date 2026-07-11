# Configuração da Integração WAHA

## Variáveis de Ambiente Necessárias

Para usar a integração com WAHA, você precisa configurar as seguintes variáveis de ambiente:

### 1. WAHA_API_URL

- **Descrição**: URL base da API WAHA
- **Exemplo**: `http://localhost:3001` ou `https://waha.example.com`
- **Padrão**: `http://localhost:3001`

### 2. WAHA_API_KEY (Opcional)

- **Descrição**: Chave de API para autenticação com WAHA
- **Exemplo**: `seu-api-key-aqui`
- **Padrão**: Não definido (sem autenticação)

## Como Configurar

### Opção 1: Usando o Management UI (Recomendado)

1. Acesse o painel de gerenciamento do seu projeto
2. Vá para **Settings → Secrets**
3. Adicione as variáveis:
   - `WAHA_API_URL`: URL da sua instância WAHA
   - `WAHA_API_KEY`: (Opcional) Sua chave de API

### Opção 2: Arquivo .env.local (Desenvolvimento)

Crie um arquivo `.env.local` na raiz do projeto:

```
WAHA_API_URL=http://localhost:3001
WAHA_API_KEY=sua-chave-api-opcional
```

## Endpoints WAHA Utilizados

A integração utiliza os seguintes endpoints da API WAHA:

### Sessões

- `GET /sessions` - Listar todas as sessões
- `GET /sessions/{sessionName}` - Obter informações de uma sessão
- `POST /sessions` - Criar nova sessão
- `GET /sessions/{sessionName}/qr` - Obter QR Code
- `POST /sessions/{sessionName}/logout` - Desconectar sessão
- `DELETE /sessions/{sessionName}` - Deletar sessão

### Mensagens

- `POST /sessions/{sessionName}/messages` - Enviar mensagem
- `GET /sessions/{sessionName}/chats/{chatId}/messages` - Obter histórico
- `POST /sessions/{sessionName}/messages/{messageId}/read` - Marcar como lida

### Contatos

- `GET /sessions/{sessionName}/contacts/{contactId}` - Obter informações de contato

### Webhooks

- `POST /sessions/{sessionName}/webhooks` - Registrar webhook
- `DELETE /sessions/{sessionName}/webhooks/{webhookId}` - Remover webhook

## Webhook URL

Para receber eventos do WAHA, configure o webhook para apontar para:

```
https://seu-dominio.com/api/webhooks/waha
```

## Eventos Suportados

A aplicação processa os seguintes eventos WAHA:

- **message**: Nova mensagem recebida
- **message.status**: Mudança no status de uma mensagem (sent, delivered, read, failed)
- **session.status**: Mudança no status da sessão (CONNECTED, DISCONNECTED, STARTING, STOPPING)

## Fluxo de Funcionamento

### 1. Criar Sessão

```
POST /api/trpc/waha.createSession
{
  "sessionName": "vendas"
}
```

### 2. Obter QR Code

```
GET /api/trpc/waha.getQRCode?sessionName=vendas
```

### 3. Escanear QR Code

- Abra WhatsApp no seu celular
- Vá para Configurações → Dispositivos Vinculados
- Escaneie o QR Code exibido

### 4. Sessão Conectada

- Após escanear, a sessão mudará para status "connected"
- Agora você pode enviar e receber mensagens

### 5. Receber Mensagens

- Quando uma mensagem é recebida, o WAHA envia um webhook
- A aplicação processa o evento e salva a mensagem no banco de dados
- A conversa é criada automaticamente se não existir

## Troubleshooting

### Erro: "Data truncated for column 'role'"

- Este é um erro de autenticação relacionado ao schema de usuários
- Verifique se o banco de dados foi migrado corretamente
- Limpe os cookies e faça login novamente

### Erro: "WAHA API não respondeu"

- Verifique se a URL da API WAHA está correta
- Certifique-se de que a instância WAHA está rodando
- Verifique a conectividade de rede

### Erro: "QR Code expirado"

- QR Codes do WAHA expiram em 2 minutos
- Clique em "Renovar QR Code" para gerar um novo

## Desenvolvimento Local

Para testar a integração localmente:

1. Instale e rode uma instância WAHA:

   ```bash
   docker run -d -p 3001:3001 devlikeapro/waha:latest
   ```

2. Configure as variáveis de ambiente:

   ```
   WAHA_API_URL=http://localhost:3001
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   pnpm dev
   ```

4. Acesse http://localhost:3000 e vá para "Sessões WhatsApp"

## Recursos Adicionais

- [Documentação WAHA](https://waha.devlike.pro)
- [API WAHA Swagger](https://waha.devlike.pro/swagger)
- [GitHub WAHA](https://github.com/devlikeapro/waha)
