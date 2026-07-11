import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Search } from "lucide-react";

interface Lead {
  id: number;
  contactId: number;
  stageId: number;
  assignedToUserId?: number;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
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

export default function Kanban() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Record<number, Lead[]>>({});

  // Fetch pipeline and stages
  const { data: pipeline } = trpc.crm.getDefaultPipeline.useQuery<Pipeline | null>();
  const { data: stagesData } = trpc.crm.getStagesByPipeline.useQuery<Stage[]>(
    { pipelineId: pipeline?.id || 0 },
    { enabled: !!pipeline?.id }
  );

  // Fetch leads for each stage
  const { data: leadsData } = trpc.crm.listLeadsByPipeline.useQuery<Lead[]>(
    { pipelineId: pipeline?.id || 0 },
    { enabled: !!pipeline?.id }
  );

  const moveLeadMutation = trpc.crm.moveLeadToStage.useMutation({
    onSuccess: () => {
      // Refetch leads after moving
    },
  });

  useEffect(() => {
    if (stagesData) {
      const stagesWithCounts = stagesData.map((s: Stage) => ({ ...s, leadCount: 0 }));
      setStages(stagesWithCounts);
      const grouped: Record<number, Lead[]> = {};
      stagesData.forEach((stage: Stage) => {
        grouped[stage.id] = [];
      });
      setLeadsByStage(grouped);
    }
  }, [stagesData]);

  useEffect(() => {
    if (leadsData) {
      const grouped: Record<number, Lead[]> = {};
      stages.forEach((stage: Stage) => {
        grouped[stage.id] = [];
      });
      leadsData.forEach((lead: Lead) => {
        if (grouped[lead.stageId]) {
          grouped[lead.stageId].push(lead);
        }
      });
      setLeadsByStage(grouped);
      setStages(prev => prev.map((stage: Stage) => ({
        ...stage,
        leadCount: grouped[stage.id]?.length || 0,
      })));
    }
  }, [leadsData, stages]);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("leadId", lead.id.toString());
    e.dataTransfer.setData("fromStageId", lead.stageId.toString());
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kanban de Vendas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus leads através do funil de vendas
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => (
              <div
                key={stage.id}
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
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className="space-y-3 min-h-96 bg-background rounded-md p-3 border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
                >
                  {leadsByStage[stage.id]?.map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      className="cursor-move hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <p className="font-medium text-sm">Lead #{lead.id}</p>
                          <div className="flex flex-wrap gap-1">
                            {lead.tags?.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {lead.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {lead.notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {!leadsByStage[stage.id]?.length && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      Arraste leads aqui
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
