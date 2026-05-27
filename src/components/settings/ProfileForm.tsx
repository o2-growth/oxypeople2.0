import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Camera, Loader2, Save } from "lucide-react";
import { useUpdateUser, useUser } from "@/hooks/useUser";
import { useUpdateMyPosition } from "@/hooks/usePeopleList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileFormProps {
  membershipId: string | null;
  user?: {
    name: string;
    email: string;
    avatar: string;
    initials: string;
    bio: string;
    phone: string;
    department: string;
    position: string;
    cpf: string;
    personalEmail: string;
    birthDate: string;
    address: string;
    cnpj: string;
    razaoSocial: string;
    calendarLink: string;
  };
}

export function ProfileForm({ membershipId, user }: ProfileFormProps) {
  const { profile } = useUser();
  const updateUser = useUpdateUser();
  const updatePosition = useUpdateMyPosition();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    bio: user?.bio ?? "",
    phone: user?.phone ?? "",
    position: user?.position ?? "",
    cpf: user?.cpf ?? "",
    personalEmail: user?.personalEmail ?? "",
    birthDate: user?.birthDate ?? "",
    address: user?.address ?? "",
    cnpj: user?.cnpj ?? "",
    razaoSocial: user?.razaoSocial ?? "",
    calendarLink: user?.calendarLink ?? "",
  });

  useEffect(() => {
    if (user) {
      setAvatarPreview(user.avatar);
      setForm({
        name: user.name,
        bio: user.bio,
        phone: user.phone,
        position: user.position,
        cpf: user.cpf,
        personalEmail: user.personalEmail,
        birthDate: user.birthDate,
        address: user.address,
        cnpj: user.cnpj,
        razaoSocial: user.razaoSocial,
        calendarLink: user.calendarLink,
      });
    }
  }, [user]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5 MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${profile.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await updateUser.mutateAsync({ avatar_url: url });
      setAvatarPreview(url);
      toast({ title: "Foto atualizada" });
    } catch (err) {
      toast({ title: "Erro ao enviar foto", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    const existingMeta = (profile.metadata as Record<string, unknown> | null) ?? {};
    try {
      const metaUpdates = Object.fromEntries(
        Object.entries({
          phone: form.phone || null,
          bio: form.bio || null,
          cpf: form.cpf || null,
          personal_email: form.personalEmail || null,
          birth_date: form.birthDate || null,
          address: form.address || null,
          cnpj: form.cnpj || null,
          razao_social: form.razaoSocial || null,
          calendar_link: form.calendarLink || null,
        }).filter(([, v]) => v !== undefined)
      );
      const promises: Promise<unknown>[] = [
        updateUser.mutateAsync({
          full_name: form.name.trim() || null,
          metadata: { ...existingMeta, ...metaUpdates },
        }),
      ];
      if (membershipId) {
        promises.push(updatePosition.mutateAsync({ membershipId, position: form.position || null }));
      }
      await Promise.all(promises);
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  };

  const isPending = updateUser.isPending || updatePosition.isPending;

  return (
    <div className="space-y-6">
      {/* Foto e nome */}
      <Card>
        <CardHeader><CardTitle className="text-base">Foto e identificação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">{user?.initials || "U"}</AvatarFallback>
              </Avatar>
              <Button size="icon" variant="secondary" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                type="button" onClick={handleAvatarClick} disabled={uploadingAvatar}>
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <p className="font-medium">{form.name || "Sem nome"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou WEBP · máx. 5 MB</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email corporativo</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={form.bio} onChange={(e) => set("bio", e.target.value)}
                placeholder="Conte um pouco sobre você..." className="min-h-[80px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados profissionais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados profissionais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input id="position" value={form.position} onChange={(e) => set("position", e.target.value)}
                placeholder="Ex: Desenvolvedor Senior" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center gap-1">
                Área <span className="text-[10px] text-muted-foreground font-normal">(admin)</span>
              </Label>
              <Input id="department" value={user?.department ?? ""} disabled placeholder="—" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                placeholder="+55 51 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendarLink">Link da agenda</Label>
              <Input id="calendarLink" value={form.calendarLink} onChange={(e) => set("calendarLink", e.target.value)}
                placeholder="https://calendar.app.google/..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados pessoais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados pessoais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="personalEmail">E-mail pessoal</Label>
              <Input id="personalEmail" type="email" value={form.personalEmail}
                onChange={(e) => set("personalEmail", e.target.value)} placeholder="nome@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input id="birthDate" type="date" value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={form.cpf} onChange={(e) => set("cpf", e.target.value)}
                placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)}
                placeholder="Rua, número, bairro, cidade - UF, CEP" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados contratuais */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados contratuais (PJ)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)}
                placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input id="razaoSocial" value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)}
                placeholder="Nome Ltda" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="gap-2" type="button" onClick={handleSave} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
}
