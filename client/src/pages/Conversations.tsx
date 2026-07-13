import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import {
  Send,
  Search,
  Phone,
  Info,
  Plus,
  Image,
  FileText,
  Music,
  Video,
  MapPin,
  Mic,
  MicOff,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  Smile,
  MoreVertical,
  X,
  Filter,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWebSocket } from "@/hooks/useWebSocket";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣",
  "😊","😇","🙂","🙃","😉","😌","😍","🥰",
  "😘","😗","😙","😋","😛","😜","🤪","😝",
  "🤗","🤭","🤫","🤔","🤐","🤨","😐","😑",
  "😶","😏","😒","😞","😔","😟","😕","🙁",
  "☹️","😣","😖","😫","😩","🥺","😢","😭",
  "😤","😠","😡","🤬","🤯","😳","🥵","🥶",
  "😱","😨","😰","😥","😓","🤗","🤔","🤭",
  "👍","👎","👌","✌️","🤞","🤟","🤘","🤙",
  "👈","👉","👆","👇","☝️","✋","🤚","🖐️",
  "👋","🤝","🙏","✍️","💅","🤳","💪","🦾",
  "❤️","🧡","💛","💚","💙","💜","🤎","🖤",
  "🤍","💔","❣️","💕","💞","💓","💗","💖",
  "💘","💝","💟","☮️","✝️","☪️","🕉️","☸️",
];

interface Conversation {
  id: number;
  contactId: number;
  leadId?: number;
  status: "active" | "waiting_human" | "closed";
  currentAssignedUserId?: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
  contact?: {
    id: number;
    whatsappNumber: string;
    name: string;
    avatar?: string;
    lastInteractionAt: Date;
  };
}

interface Message {
  id: number;
  conversationId: number;
  senderId?: number;
  senderPhone?: string;
  type: "text" | "image" | "audio" | "video" | "document" | "location";
  content?: string;
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  waMessageId?: string;
  status: "sent" | "delivered" | "read";
  createdAt: Date;
  sender?: {
    id: number;
    name: string;
  };
}

export default function Conversations() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } =
    trpc.conversations.list.useQuery<Conversation[]>({
      status: "active",
      tag: selectedTag || undefined,
      limit: 50,
    });

  // Fetch selected conversation details with messages
  const { data: selectedConversationData, isLoading: messagesLoading, refetch: refetchMessages } =
    trpc.conversations.get.useQuery(
      { id: selectedConversationId || 0 },
      { enabled: !!selectedConversationId }
    );

  const selectedConversation = selectedConversationData as any;

  // Fetch tags for filter
  const { data: allTags } = trpc.tags.list.useQuery<string[]>({
    enabled: true,
  });

  // Send message mutation
  const sendMessageMutation = trpc.conversations.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
      refetchConversations();
    },
  });

  // WebSocket for real-time updates
  const { isConnected, lastMessage, joinConversation, sendTyping } = useWebSocket(
    user?.id || null,
    (message) => {
      if (message.type === "new_message" && message.conversationId === selectedConversationId) {
        refetchMessages();
        refetchConversations();
      } else if (message.type === "conversation_updated") {
        refetchConversations();
      } else if (message.type === "typing" && message.conversationId === selectedConversationId) {
        setTypingUsers((prev) => new Set(prev).add(message.userId));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(message.userId);
            return next;
          });
        }, 3000);
      }
    }
  );

  // Join conversation via WebSocket when selected
  useEffect(() => {
    if (selectedConversationId && isConnected) {
      joinConversation(selectedConversationId);
    }
  }, [selectedConversationId, isConnected, joinConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversationData]);

  const handleSendMessage = () => {
    if (!selectedConversationId || !messageText.trim()) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      type: "text",
      content: messageText,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!selectedConversationId) return;
    
    sendTyping(selectedConversationId);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      // Could send "stop typing" if needed
    }, 1000);
  };

  const filteredConversations =
    conversations?.filter(
      (conv) =>
        conv.id.toString().includes(searchTerm) ||
        conv.contactId.toString().includes(searchTerm) ||
        conv.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.contact?.whatsappNumber.includes(searchTerm)
    ) || [];

  const hasActiveFilters = searchTerm || selectedTag;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "waiting_human":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativa";
      case "waiting_human":
        return "Aguardando Atendente";
      case "closed":
        return "Encerrada";
      default:
        return status;
    }
  };

  const renderMessageContent = (msg: Message) => {
    const isOwn = msg.senderId === user?.id;
    
    switch (msg.type) {
      case "image":
        return (
          <div className="max-w-xs">
            <img
              src={msg.mediaUrl}
              alt={msg.content || "Imagem"}
              className="rounded-lg max-h-64 w-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(msg.mediaUrl, "_blank")}
            />
            {msg.content && <p className="mt-2 text-sm">{msg.content}</p>}
          </div>
        );
      case "audio":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-md">
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Music className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <audio controls src={msg.mediaUrl} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">Áudio de voz</p>
            </div>
          </div>
        );
      case "video":
        return (
          <div className="max-w-xs">
            <video
              src={msg.mediaUrl}
              controls
              className="rounded-lg max-h-64 w-auto"
            />
            {msg.content && <p className="mt-2 text-sm">{msg.content}</p>}
          </div>
        );
      case "document":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-md border">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{msg.content || "Documento"}</p>
              <p className="text-xs text-muted-foreground">
                {msg.metadata?.fileName || "Arquivo"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(msg.mediaUrl, "_blank")}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        );
      case "location":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-md border">
            <MapPin className="h-8 w-8 text-red-500" />
            <div className="flex-1">
              <p className="font-medium">Localização</p>
              <p className="text-xs text-muted-foreground">
                {msg.metadata?.address || "Ver localização"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(msg.mediaUrl, "_blank")}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  const renderMessageStatus = (msg: Message) => {
    if (msg.senderId !== user?.id) return null;

    switch (msg.status) {
      case "read":
        return <CheckCheck className="h-4 w-4 text-blue-500" title="Lida" />;
      case "delivered":
        return <CheckCheck className="h-4 w-4 text-gray-400" title="Entregue" />;
      case "sent":
      default:
        return <Check className="h-4 w-4 text-gray-400" title="Enviada" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] gap-4">
        {/* Left Panel - Conversations List */}
        <div className="w-80 flex flex-col border rounded-lg bg-background">
          {/* Header */}
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Mensagens</h2>
              <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                {isConnected ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Online
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Offline
                  </>
                )}
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedTag || ""} onValueChange={v => setSelectedTag(v || null)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {conversationsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Carregando conversas...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa ativa"}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${
                      selectedConversationId === conv.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.contact?.avatar} alt={conv.contact?.name || ""} />
                          <AvatarFallback className="text-xs font-medium">
                            {conv.contact?.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">
                              {conv.contact?.name || `Contato #${conv.contactId}`}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                                conv.status
                              )}`}
                            >
                              {getStatusLabel(conv.status)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.contact?.whatsappNumber}
                          </p>
                          {conv.unreadCount && conv.unreadCount > 0 && (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full"
                            >
                              {conv.unreadCount} nova{conv.unreadCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Chat */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col border rounded-lg bg-background">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.contact?.avatar} alt="" />
                  <AvatarFallback className="text-sm font-medium">
                    {selectedConversation.contact?.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">
                    {selectedConversation.contact?.name || `Contato #${selectedConversation.contactId}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.contact?.whatsappNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedConversation.status === "waiting_human" ? "destructive" : "secondary"}>
                  {getStatusLabel(selectedConversation.status)}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer">
                      <Phone className="mr-2 h-4 w-4" />
                      Ligar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Info className="mr-2 h-4 w-4" />
                      Detalhes do Contato
                    </DropdownMenuItem>
                    {selectedConversation.status !== "closed" && (
                      <DropdownMenuItem
                        className="cursor-pointer text-orange-600"
                        onClick={() => {
                          trpc.conversations.updateStatus.mutate({
                            id: selectedConversationId,
                            status: "waiting_human",
                          });
                        }}
                      >
                      Transferir para Atendente
                    </DropdownMenuItem>
                    )}
                    {selectedConversation.status === "waiting_human" && (
                      <DropdownMenuItem
                        className="cursor-pointer text-green-600"
                        onClick={() => {
                          trpc.conversations.updateStatus.mutate({
                            id: selectedConversationId,
                            status: "active",
                          });
                        }}
                      >
                        Reativar IA
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600"
                      onClick={() => {
                        if (confirm("Encerrar esta conversa?")) {
                          trpc.conversations.updateStatus.mutate({
                            id: selectedConversationId,
                            status: "closed",
                          });
                        }
                      }}
                    >
                      Encerrar Conversa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="px-4 py-2 text-xs text-muted-foreground italic border-b">
                {Array.from(typingUsers).length === 1
                  ? "Digitando..."
                  : `${typingUsers.size} pessoas digitando...`}
              </div>
            )}

{/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {(
                  messagesLoading && selectedConversation?.messages?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      Carregando mensagens...
                    </div>
                  ) : selectedConversation?.messages?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="mb-2">Nenhuma mensagem nesta conversa</p>
                      <p className="text-sm">Seja o primeiro a enviar uma mensagem</p>
                    </div>
                  ) : (
                    selectedConversation.messages
                      ?.slice()
                      .reverse()
                      .map((msg: Message, idx: number) => {
                        const isOwn = msg.senderId === user?.id;
                        const showTime =
                          idx === 0 ||
                          (selectedConversation.messages[
                            selectedConversation.messages.length - 1 - idx - 1
                          ] &&
                            new Date(msg.createdAt).getTime() -
                              new Date(
                                selectedConversation.messages[
                                  selectedConversation.messages.length - 1 - idx - 1
                                ].createdAt
                              ).getTime() >
                            5 * 60 * 1000);

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] ${
                                isOwn
                                  ? "rounded-2xl rounded-tr-none bg-primary text-primary-foreground"
                                  : "rounded-2xl rounded-tl-none bg-muted"
                              }`}
                            >
                              <div className="p-3">{renderMessageContent(msg)}</div>
                              <div
                                className={`flex items-end gap-1 px-3 pb-2 ${
                                  isOwn ? "justify-end" : "justify-start"
                                }`}
                              >
                                <span className="text-xs opacity-60">
                                  {formatDistanceToNow(new Date(msg.createdAt), {
                                    addSuffix: false,
                                    locale: ptBR,
                                  })}
                                </span>
                                {renderMessageStatus(msg)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t space-y-3 bg-muted/50">
              <div className="relative">
                <div className="flex items-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Digite uma mensagem..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={!selectedConversationId}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      !messageText.trim() || sendMessageMutation.isPending
                    }
                    size="icon"
                    className="h-10 w-10 shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-12 right-12 mb-2 bg-popover border rounded-lg shadow-lg p-2 z-10">
                    <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setMessageText((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="text-2xl hover:bg-muted rounded p-1 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedConversation?.status === "waiting_human" && (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Esta conversa está aguardando um atendente humano
                </div>
              )}
              
              {selectedConversation?.status === "closed" && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  🔒 Conversa encerrada
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/50">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Selecione uma conversa para começar
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conversa
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}