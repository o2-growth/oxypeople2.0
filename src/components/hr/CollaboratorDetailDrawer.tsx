import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Save, Mail, Phone, MapPin, Calendar, Building2, Briefcase, Link2, FileText, User, KeyRound, Copy, Check } from "lucide-react";
import {
  useCollaboratorDetail,
  useAdminUpdateCollaborator,
} from "@/hooks/usePeopleList";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { useDepartmentOptions } from "@/hooks/usePeopleWithBirthdays";

const NO_DEPT = "__none__";

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Admin",
  manager: "Gestor",
  member: "Membro",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  invited: "Convidado",
  pending: "Pendente",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground",
  invited: "bg-accent/10 text-accent border-accent/20",
  pending: "bg-warning/10 text-warning border-warning/20",
};

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0];
  return source.split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

interface Props {
  membershipId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

export function CollaboratorDetailDrawer({ membershipId, open, onOpenChange, isAdmin }: Props) {
  const { data, isLoading } = useCollaboratorDetail(membershipId);
  const { data: departments = [] } = useDepartmentOptions();
  const updateCollaborator = useAdminUpdateCollaborator();
  const { profile } = useUser();
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleResetPassword() {
    if (!data?.email || !profile?.primary_company_id) return;
    setResetLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("reset-user-password", {
        body: { email: data.email, companyId: profile.primary_company_id },
      });
      if (error || !result?.success) throw new Error(result?.error ?? error?.message);
      setResetLink(result.link);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar link";
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  }

  function handleCopy() {
    if (!resetLink) return;
    navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [form, setForm] = useState({
    full_name: "",
    position: "",
    department_id: NO_DEPT,
    hire_date: "",
    employment_type: "",
    status: "active" as "active" | "inactive",
    role: "member" as "owner" | "admin" | "manager" | "member",
    phone: "",
    personal_email: "",
    cpf: "",
    birth_date: "",
    address: "",
    cnpj: "",
    razao_social: "",
    calendar_link: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        position: data.position ?? "",
        department_id: data.department_id ?? NO_DEPT,
        hire_date: data.hire_date ?? "",
        employment_type: data.employment_type ?? "",
        status: data.status === "active" ? "active" : "inactive",
        role: data.role ?? "member",
        phone: data.phone ?? "",
        personal_email: data.personal_email ?? "",
        cpf: data.cpf ?? "",
        birth_date: data.birth_date ?? "",
        address: data.address ?? "",
        cnpj: data.cnpj ?? "",
        razao_social: data.razao_social ?? "",
        calendar_link: data.calendar_link ?? "",
      });
    }
  }, [data]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!data) return;

    const metaUpdates: Record<string, unknown> = {
      phone: form.phone || null,
      personal_email: form.personal_email || null,
      cpf: form.cpf || null,
      birth_date: form.birth_date || null,
      address: form.address || null,
      cnpj: form.cnpj || null,
      razao_social: form.razao_social || null,
      calendar_link: form.calendar_link || null,
    };

    await updateCollaborator.mutateAsync({
      membershipId: data.membershipId,
      userId: data.userId,
      full_name: form.full_name || null,
      metadata: metaUpdates,
      position: form.position || null,
      department_id: form.department_id === NO_DEPT ? null : form.department_id,
      hire_date: form.hire_date || null,
      employment_type: form.employment_type || null,
      status: form.status,
      role: form.role,
    });
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading || !data ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                  <AvatarImage src={data.avatar_url ?? undefined} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(data.full_name, data.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="text-left truncate">
                    {data.full_name || data.email}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground truncate">{data.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={statusColors[data.status]}>
                      {statusLabels[data.status]}
                    </Badge>
                    {data.role && (
                      <Badge variant="secondary" className="text-xs">
                        {roleLabels[data.role]}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {/* Dados Profissionais */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <Briefcase className="h-3.5 w-3.5" />
                  Dados Profissionais
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cargo</Label>
                    <Input value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="—" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Área</Label>
                    <Select value={form.department_id} onValueChange={(v) => set("department_id", v)} disabled={!isAdmin}>
                      <SelectTrigger><SelectValue placeholder="Sem área" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DEPT}>Sem área</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Função</Label>
                    <Select value={form.role} onValueChange={(v) => set("role", v)} disabled={!isAdmin}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => set("status", v)} disabled={!isAdmin}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de contratação</Label>
                    <Input type="date" value={form.hire_date} onChange={(e) => set("hire_date", e.target.value)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Tipo de contratação</Label>
                    <Input value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)} placeholder="PJ, CLT..." disabled={!isAdmin} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Dados Pessoais */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <User className="h-3.5 w-3.5" />
                  Dados Pessoais
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />E-mail pessoal</Label>
                    <Input type="email" value={form.personal_email} onChange={(e) => set("personal_email", e.target.value)} placeholder="—" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Telefone</Label>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="—" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />CPF</Label>
                    <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Data de nascimento</Label>
                    <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Endereço</Label>
                    <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="—" disabled={!isAdmin} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Dados Contratuais */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <Building2 className="h-3.5 w-3.5" />
                  Dados Contratuais (PJ)
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>CNPJ</Label>
                    <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Razão Social</Label>
                    <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} placeholder="—" disabled={!isAdmin} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Link da agenda</Label>
                    <Input value={form.calendar_link} onChange={(e) => set("calendar_link", e.target.value)} placeholder="https://calendar.app.google/..." disabled={!isAdmin} />
                  </div>
                </div>
              </section>

              {isAdmin && (
                <div className="space-y-2">
                  <Button className="w-full gap-2" onClick={handleSave} disabled={updateCollaborator.isPending}>
                    {updateCollaborator.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                      : <><Save className="h-4 w-4" />Salvar alterações</>}
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={handleResetPassword} disabled={resetLoading}>
                    {resetLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando link...</>
                      : <><KeyRound className="h-4 w-4" />Gerar link de reset de senha</>}
                  </Button>
                </div>
              )}

              <Dialog open={!!resetLink} onOpenChange={(o) => { if (!o) setResetLink(null); }}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Link de reset de senha</DialogTitle>
                    <DialogDescription>
                      Copie e envie para <strong>{data?.full_name || data?.email}</strong>. O link expira em 24h e é de uso único.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2">
                    <Input readOnly value={resetLink ?? ""} className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
