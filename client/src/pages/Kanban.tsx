import { useEffect, useState, useCallback } from "react";
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
import { trpc } from "@/lib/trpc";
import { Plus, Search, Filter, X, Calendar, User, Tag, MoreHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: number;
  contactId: number;
  stageId: number;
  assignedToUserId?: number;
  tags: string[];
  notes?: string;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  contact?: {
    id: number;
    name: string;
    whatsappNumber: string;
    email?: string;
    avatar?: string;
  };
  stage?: {
    id: number;
    name: string;
  };
  assignee?: {
    id: number;
    name: string;
  };
}

interface Stage {
  id: number;
  pipelineId: number;
  name: string;
  order: number;
  createdAt: Date;
  leadCount?: number;
}

interface Pipeline {
  id: number;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: number;
  name: string;
  email: string;
}

function StageColumn({
  stage,
  leads,
  onDragOver,
  onDrop,
  onLeadClick,
  onTagToggle,
  onAssigneeChange,
  onDueDateChange,
  users,
}: {
  stage: Stage;
  leads: Lead[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: number) => void;
  onLeadClick: (lead: Lead) => void;
  onTagToggle: (lead: Lead, tag: string) => void;
  onAssigneeChange: (lead: Lead, userId: number | null) => void;
  onDueDateChange: (lead: Lead, date: Date | null) => void;
  users: User[];
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, stage.id)}
      className="flex-shrink-0 w-80 bg-muted rounded-lg p-4"
    >
      {/* Stage Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{stage.name}</h3>
          <Badge variant="secondary">{stage.leadCount || 0}</Badge>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className="space-y-3 min-h-96 bg-background rounded-md p-3 border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
      >
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Arraste leads aqui
          </div>
        )}
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
            onTagToggle={onTagToggle}
            onAssigneeChange={onAssigneeChange}
            onDueDateChange={onDueDateChange}
            users={users}
          />
        ))}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  onClick,
  onTagToggle,
  onAssigneeChange,
  onDueDateChange,
  users,
}: {
  lead: Lead;
  onClick: () => void;
  onTagToggle: (lead: Lead, tag: string) => void;
  onAssigneeChange: (lead: Lead, userId: number | null) => void;
  onDueDateChange: (lead: Lead, date: Date | null) => void;
  users: User[];
}) {
  const assignee = users.find(u => u.id === lead.assignedToUserId);
  const isOverdue = lead.dueDate && new Date(lead.dueDate) < new Date() && lead.stage?.name !== "Ganho" && lead.stage?.name !== "Perdido";

  return (
    <Card
      onClick={onClick}
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("leadId", lead.id.toString());
        e.dataTransfer.setData("fromStageId", lead.stageId.toString());
      }}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm flex-1 min-w-0">
              {lead.contact?.name || `Lead #${lead.id}`}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  Ver detalhes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {lead.contact?.whatsappNumber && (
            <p className="text-xs text-muted-foreground font-mono">
              {lead.contact.whatsappNumber}
            </p>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-muted"
                  onClick={e => {
                    e.stopPropagation();
                    onTagToggle(lead, tag);
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Assignee & Due Date */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              {assignee ? (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{assignee.name}</span>
                </div>
              ) : (
                <Badge variant="secondary" className="text-xs h-5 px-2">
                  Sem responsável
                </Badge>
              )}
            </div>
            {lead.dueDate && (
              <Badge
                variant={isOverdue ? "destructive" : "secondary"}
                className="text-xs h-5 px-2 flex items-center gap-1"
              >
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(lead.dueDate), { addSuffix: true, locale: ptBR })}
              </Badge>
            )}
          </div>

          {lead.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {lead.notes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LeadDetailDialog({
  lead,
  stages,
  users,
  allTags,
  onClose,
  onUpdateTags,
  onUpdateAssignee,
  onUpdateDueDate,
  onMoveStage,
}: {
  lead: Lead;
  stages: Stage[];
  users: User[];
  allTags: string[];
  onClose: () => void;
  onUpdateTags: (lead: Lead, tag: string) => void;
  onUpdateAssignee: (lead: Lead, userId: number | null) => void;
  onUpdateDueDate: (lead: Lead, date: Date | null) => void;
  onMoveStage: (stageId: number) => void;
}) {
  const [newTag, setNewTag] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(lead.dueDate ? new Date(lead.dueDate) : undefined);

  const handleAddTag = () => {
    if (newTag.trim() && !lead.tags?.includes(newTag.trim())) {
      onUpdateTags(lead, newTag.trim());
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    onUpdateTags(lead, tag);
  };

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl">
          {lead.contact?.name || `Lead #${lead.id}`}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações do Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.contact?.whatsappNumber && (
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-mono text-sm">{lead.contact.whatsappNumber}</p>
              </div>
            )}
            {lead.contact?.email && (
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{lead.contact.email}</p>
              </div>
            )}
            {lead.contact?.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-sm">{lead.contact.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Detalhes do Lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Estágio Atual</p>
              <Select
                value={lead.stageId.toString()}
                onValueChange={v => onMoveStage(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Responsável</p>
              <Select
                value={lead.assignedToUserId?.toString() || ""}
                onValueChange={v => onUpdateAssignee(lead, v ? parseInt(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem responsável</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Data de Vencimento</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={dueDate ? "" : "text-muted-foreground"}
                  >
                    {dueDate
                      ? new Date(dueDate).toLocaleDateString("pt-BR")
                      : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={date => {
                      setDueDate(date);
                      onUpdateDueDate(lead, date);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Tags</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Nova tag"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddTag()}
              className="w-48"
            />
            <Button size="sm" onClick={handleAddTag} disabled={!newTag.trim()}>
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(lead.tags || []).map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className="gap-1"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag}
                <X className="h-3 w-3 cursor-pointer" onClick={e => { e.stopPropagation(); handleRemoveTag(tag); }} />
              </Badge>
            ))}
            {allTags.filter(tag => !lead.tags?.includes(tag)).map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-muted"
                onClick={() => onUpdateTags(lead, tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            defaultValue={lead.notes || ""}
            className="w-full min-h-[100px] p-2 border rounded bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            onBlur={e => {
              // TODO: Save notes
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function Kanban() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState<number | "unassigned" | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Record<number, Lead[]>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Fetch pipeline and stages
  const { data: pipeline } = trpc.crm.getDefaultPipeline.useQuery<Pipeline | null>();
  const { data: stagesData, refetch: refetchStages } = trpc.crm.getStagesByPipeline.useQuery<Stage[]>({
    pipelineId: pipeline?.id || 0,
    enabled: !!pipeline?.id,
  });

  // Fetch leads for pipeline
  const { data: leadsData, refetch: refetchLeads } = trpc.crm.listLeadsByPipeline.useQuery<Lead[]>({
    pipelineId: pipeline?.id || 0,
    enabled: !!pipeline?.id,
  });

  // Fetch users for assignee filter
  const { data: usersData } = trpc.crm.listUsers.useQuery<User[]>({ enabled: true });

  // Mutations
  const moveLeadMutation = trpc.crm.moveLeadToStage.useMutation({
    onSuccess: () => {
      refetchLeads();
    },
  });

  const updateLeadTagsMutation = trpc.crm.updateLeadTags.useMutation({
    onSuccess: () => {
      refetchLeads();
    },
  });

  const updateLeadAssigneeMutation = trpc.crm.updateLeadAssignee.useMutation({
    onSuccess: () => {
      refetchLeads();
    },
  });

  const updateLeadDueDateMutation = trpc.crm.updateLeadDueDate.useMutation({
    onSuccess: () => {
      refetchLeads();
    },
  });

  // Update users
  useEffect(() => {
    if (usersData) {
      setUsers(usersData);
    }
  }, [usersData]);

  // Process stages
  useEffect(() => {
    if (stagesData) {
      const stagesWithCounts = stagesData.map((s: Stage) => ({
        ...s,
        leadCount: 0,
      }));
      setStages(stagesWithCounts);
      const grouped: Record<number, Lead[]> = {};
      stagesData.forEach((stage: Stage) => {
        grouped[stage.id] = [];
      });
      setLeadsByStage(grouped);
    }
  }, [stagesData]);

  // Process leads
  useEffect(() => {
    if (leadsData) {
      const grouped: Record<number, Lead[]> = {};
      stages.forEach((stage: Stage) => {
        grouped[stage.id] = [];
      });
      
      // Extract all unique tags
      const tagSet = new Set<string>();
      
      leadsData.forEach((lead: Lead) => {
        if (grouped[lead.stageId]) {
          grouped[lead.stageId].push(lead);
        }
        lead.tags?.forEach(tag => tagSet.add(tag));
      });
      
      setAllTags(Array.from(tagSet).sort());
      
      setLeadsByStage(grouped);
      setStages(prev =>
        prev.map((stage: Stage) => ({
          ...stage,
          leadCount: grouped[stage.id]?.length || 0,
        }))
      );
    }
  }, [leadsData, stages]);

  // Filter leads
  const getFilteredLeads = useCallback((stageId: number) => {
    let leads = leadsByStage[stageId] || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      leads = leads.filter(lead =>
        lead.id.toString().includes(term) ||
        lead.contact?.name?.toLowerCase().includes(term) ||
        lead.contact?.whatsappNumber?.includes(term) ||
        lead.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    if (selectedAssignee === "unassigned") {
      leads = leads.filter(lead => !lead.assignedToUserId);
    } else if (selectedAssignee) {
      leads = leads.filter(lead => lead.assignedToUserId === selectedAssignee);
    }
    
    if (selectedTag) {
      leads = leads.filter(lead => lead.tags?.includes(selectedTag));
    }
    
    return leads;
  }, [leadsByStage, searchTerm, selectedAssignee, selectedTag]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    const fromStageId = parseInt(e.dataTransfer.getData("fromStageId"));

    if (fromStageId !== stageId) {
      moveLeadMutation.mutate({
        leadId,
        stageId,
      });
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
  };

  const handleTagToggle = (lead: Lead, tag: string) => {
    const newTags = lead.tags?.includes(tag)
      ? lead.tags?.filter(t => t !== tag) || []
      : [...(lead.tags || []), tag];
    updateLeadTagsMutation.mutate({ leadId: lead.id, tags: newTags });
  };

  const handleAssigneeChange = (lead: Lead, userId: number | null) => {
    updateLeadAssigneeMutation.mutate({ leadId: lead.id, assignedToUserId: userId });
  };

  const handleDueDateChange = (lead: Lead, date: Date | null) => {
    updateLeadDueDateMutation.mutate({ leadId: lead.id, dueDate: date });
  };

  const hasActiveFilters = searchTerm || selectedAssignee || selectedTag;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kanban de Vendas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus leads através do funil de vendas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => {
              setSearchTerm("");
              setSelectedAssignee(null);
              setSelectedTag(null);
            }} disabled={!hasActiveFilters}>
              <X className="h-4 w-4" />
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedAssignee || ""} onValueChange={v => setSelectedAssignee(v || null)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem responsável</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.length === 0 ? (
              <div className="flex items-center justify-center h-64 w-full text-muted-foreground">
                Nenhum pipeline configurado. Crie um pipeline nas configurações.
              </div>
            ) : (
              stages.map(stage => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  leads={getFilteredLeads(stage.id)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onLeadClick={handleLeadClick}
                  onTagToggle={handleTagToggle}
                  onAssigneeChange={handleAssigneeChange}
                  onDueDateChange={handleDueDateChange}
                  users={users}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <LeadDetailDialog
              lead={selectedLead}
              stages={stages}
              users={users}
              allTags={allTags}
              onClose={() => setShowLeadDetail(false)}
              onUpdateTags={handleTagToggle}
              onUpdateAssignee={handleAssigneeChange}
              onUpdateDueDate={handleDueDateChange}
              onMoveStage={(stageId: number) => moveLeadMutation.mutate({ leadId: selectedLead.id, stageId })}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}