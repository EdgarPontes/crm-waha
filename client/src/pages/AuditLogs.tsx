import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Search, RotateCcw, Shield, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { statusStyles } from "@/lib/status-colors";

const PAGE_SIZE = 50;

const actionLabels: Record<string, { label: string; color: string }> = {
  login: { label: "Login", color: statusStyles.info },
  logout: { label: "Logout", color: statusStyles.muted },
  create: { label: "Criação", color: statusStyles.success },
  update: { label: "Atualização", color: statusStyles.warning },
  delete: { label: "Exclusão", color: statusStyles.danger },
  move_kanban: { label: "Mov. Kanban", color: statusStyles.violet },
  transfer_conversation: { label: "Transferência", color: statusStyles.orange },
  send_message: { label: "Envio Msg", color: statusStyles.cyan },
  receive_message: { label: "Receb. Msg", color: statusStyles.indigo },
};

const entityLabels: Record<string, string> = {
  lead: "Lead",
  conversation: "Conversa",
  message: "Mensagem",
  contact: "Contato",
  user: "Usuário",
  automation: "Automação",
  ai_config: "IA",
  session: "Sessão",
};

function formatChanges(changes: unknown): string {
  if (!changes || typeof changes !== "object") return "-";
  try {
    const entries = Object.entries(changes as Record<string, unknown>);
    if (entries.length === 0) return "-";
    return entries
      .map(([k, v]) => {
        const val = typeof v === "string" ? v : JSON.stringify(v);
        return `${k}: ${val}`;
      })
      .join("; ");
  } catch {
    return "-";
  }
}

export default function AuditLogs() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filters = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (actionFilter !== "all") f.action = actionFilter;
    if (entityFilter !== "all") f.entityType = entityFilter;
    if (userFilter !== "all") f.userId = parseInt(userFilter);
    if (startDate) f.startDate = new Date(startDate);
    if (endDate) f.endDate = new Date(endDate + "T23:59:59.999");
    return f;
  }, [actionFilter, entityFilter, userFilter, startDate, endDate]);

  const { data, isLoading } = trpc.audit.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...filters,
  });

  const { data: filterData } = trpc.audit.filters.useQuery();
  // Only show for supervisors and admins
  const isAuthorized =
    user?.role === "Administrador" || user?.role === "Supervisor";

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  function clearFilters() {
    setActionFilter("all");
    setEntityFilter("all");
    setUserFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(0);
  }

  if (!isAuthorized) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-2">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Acesso restrito a Supervisores e Administradores
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground mt-1">
            Registro de atividades do sistema
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-xs font-medium text-muted-foreground">
                  Ação
                </label>
                <Select
                  value={actionFilter}
                  onValueChange={v => {
                    setActionFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filterData?.actions?.map(a => (
                      <SelectItem key={a} value={a}>
                        {actionLabels[a]?.label ?? a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-xs font-medium text-muted-foreground">
                  Entidade
                </label>
                <Select
                  value={entityFilter}
                  onValueChange={v => {
                    setEntityFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filterData?.entityTypes?.map(e => (
                      <SelectItem key={e} value={e}>
                        {entityLabels[e] ?? e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">
                  Usuário
                </label>
                <Select
                  value={userFilter}
                  onValueChange={v => {
                    setUserFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {filterData?.users?.map(
                      (u: {
                        id: number;
                        name: string | null;
                        email: string;
                      }) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name ?? u.email}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Início
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-[150px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Fim
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-[150px]"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Limpar filtros"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registros de Auditoria
            </CardTitle>
            <CardDescription>
              {data ? `${data.total} registros encontrados` : "Carregando..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data && data.logs.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Data</TableHead>
                      <TableHead className="w-[120px]">Usuário</TableHead>
                      <TableHead className="w-[120px]">Ação</TableHead>
                      <TableHead className="w-[100px]">Entidade</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.map(
                      (log: {
                        id: number;
                        createdAt: string | Date | null;
                        userName: string | null;
                        userEmail: string | null;
                        userId: number | null;
                        action: string | null;
                        entityType: string | null;
                        entityId: number | null;
                        changes: unknown;
                      }) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {log.createdAt
                              ? format(
                                  new Date(log.createdAt),
                                  "dd/MM/yyyy HH:mm:ss",
                                  { locale: ptBR }
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.userName ??
                              log.userEmail ??
                              (log.userId ? `ID ${log.userId}` : "-")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                actionLabels[log.action ?? ""]?.color ??
                                statusStyles.muted
                              }
                            >
                              {actionLabels[log.action ?? ""]?.label ??
                                log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.entityType
                              ? (entityLabels[log.entityType] ?? log.entityType)
                              : "-"}
                            {log.entityId ? ` #${log.entityId}` : ""}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                            {formatChanges(log.changes)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage(Math.max(0, page - 1))}
                            className={
                              page === 0
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(totalPages, 7) }).map(
                          (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 7) {
                              pageNum = i;
                            } else if (page < 3) {
                              pageNum = i;
                            } else if (page > totalPages - 4) {
                              pageNum = totalPages - 7 + i;
                            } else {
                              pageNum = page - 3 + i;
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => setPage(pageNum)}
                                  isActive={page === pageNum}
                                >
                                  {pageNum + 1}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setPage(Math.min(totalPages - 1, page + 1))
                            }
                            className={
                              page >= totalPages - 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mr-3" />
                <p>Nenhum registro de auditoria encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
