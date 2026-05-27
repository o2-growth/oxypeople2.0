import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCollaboratorsDetails } from "@/hooks/useDashboardDetails";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollaboratorsDetailDialog({ open, onOpenChange }: Props) {
  const { data, isLoading } = useCollaboratorsDetails(open);
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Total de Colaboradores
          </DialogTitle>
          <DialogDescription>Visão detalhada dos colaboradores ativos</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold">{data.total}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <p className="text-2xl font-bold">{data.newThisMonth}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Novos este mês</p>
                </div>
              </div>

              {/* Department distribution */}
              {data.departments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    Por Área
                  </h4>
                  <div className="space-y-2.5">
                    {data.departments.map(dept => (
                      <div key={dept.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate">{dept.name}</span>
                          <span className="font-medium">{dept.count}</span>
                        </div>
                        <Progress value={(dept.count / data.total) * 100} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members list */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Colaboradores</h4>
                <div className="space-y-2">
                  {data.members.slice(0, 10).map(member => (
                    <div key={member.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/30 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {(member.full_name || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.position || member.department || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>

        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => {
            onOpenChange(false);
            navigate("/hr");
          }}
        >
          Ver todos
        </Button>
      </DialogContent>
    </Dialog>
  );
}
