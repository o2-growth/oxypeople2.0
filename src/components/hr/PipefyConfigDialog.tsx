import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePipefySync, PipefyTable, PipefyOrganization } from "@/hooks/usePipefySync";
import { Loader2, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";

interface PipefyConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PEOPLE_HUB_FIELDS = [
  { key: "email", label: "E-mail Pessoal", required: true },
  { key: "corporate_email", label: "E-mail Corporativo", required: false, hint: "Preferido para login (ex: @o2inc.com.br)" },
  { key: "full_name", label: "Nome Completo", required: true },
  { key: "position", label: "Cargo", required: false },
  { key: "department", label: "Área", required: false },
  { key: "team", label: "Time", required: false },
  { key: "hire_date", label: "Data de Admissão", required: false },
  { key: "birth_date", label: "Data de Nascimento", required: false },
  { key: "employment_type", label: "Tipo de Contrato", required: false },
  { key: "situation", label: "Situação (Ativo/Inativo)", required: false, hint: "Governa o status na plataforma" },
  { key: "termination_date", label: "Data de Desligamento", required: false },
  { key: "termination_reason", label: "Motivo de Desligamento", required: false },
];

export function PipefyConfigDialog({ open, onOpenChange }: PipefyConfigDialogProps) {
  const { 
    syncConfig, 
    fetchTables, 
    isFetchingTables, 
    saveConfig, 
    isSavingConfig 
  } = usePipefySync();
  
  const [step, setStep] = useState(1);
  const [organizations, setOrganizations] = useState<PipefyOrganization[]>([]);
  const [tables, setTables] = useState<PipefyTable[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedTableFields, setSelectedTableFields] = useState<PipefyTable["table_fields"]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Load existing config
  useEffect(() => {
    if (syncConfig && open) {
      setSelectedOrg(syncConfig.organization_id || "");
      setSelectedTable(syncConfig.table_id || "");
      setFieldMapping(syncConfig.field_mapping || {});
    }
  }, [syncConfig, open]);

  const handleFetchTables = async () => {
    setError(null);
    try {
      const result = await fetchTables(selectedOrg || undefined);
      setOrganizations(result.organizations);
      setTables(result.tables);
      
      if (result.currentOrganization && !selectedOrg) {
        setSelectedOrg(result.currentOrganization.id);
      }
      
      if (result.tables.length > 0) {
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOrgChange = async (orgId: string) => {
    setSelectedOrg(orgId);
    setError(null);
    try {
      const result = await fetchTables(orgId);
      setTables(result.tables);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId);
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      setSelectedTableFields(table.table_fields);
    }
  };

  const handleMappingChange = (peopleHubField: string, pipefyField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [peopleHubField]: pipefyField,
    }));
  };

  const handleSave = async () => {
    if (!fieldMapping.email || !fieldMapping.full_name) {
      setError("E-mail e Nome Completo são campos obrigatórios");
      return;
    }

    try {
      await saveConfig({
        tableId: selectedTable,
        organizationId: selectedOrg,
        fieldMapping,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Integração Pipefy</DialogTitle>
          <DialogDescription>
            {step === 1 && "Conecte-se ao Pipefy para buscar suas tabelas de colaboradores"}
            {step === 2 && "Selecione a tabela fonte e mapeie os campos"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="text-center">
                <h3 className="font-medium">Conectar ao Pipefy</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique no botão abaixo para buscar suas organizações e tabelas
                </p>
              </div>
              <Button onClick={handleFetchTables} disabled={isFetchingTables}>
                {isFetchingTables ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    Conectar ao Pipefy
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            {organizations.length > 1 && (
              <div className="space-y-2">
                <Label>Organização</Label>
                <Select value={selectedOrg} onValueChange={handleOrgChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma organização" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tabela de Colaboradores</Label>
              <Select value={selectedTable} onValueChange={handleTableSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tabela fonte" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTable && selectedTableFields.length > 0 && (
              <div className="space-y-4">
                <Label>Mapeamento de Campos</Label>
                <p className="text-sm text-muted-foreground">
                  Associe os campos do Pipefy aos campos do People Hub
                </p>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {PEOPLE_HUB_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <span className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Select
                          value={fieldMapping[field.key] || "__none__"}
                          onValueChange={(value) => handleMappingChange(field.key, value === "__none__" ? "" : value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione o campo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Não mapear</SelectItem>
                            {selectedTableFields.map((pf) => (
                              <SelectItem key={pf.id} value={pf.label}>
                                {pf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldMapping[field.key] && (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {step === 2 && (
            <Button onClick={handleSave} disabled={isSavingConfig || !selectedTable}>
              {isSavingConfig ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configuração"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
