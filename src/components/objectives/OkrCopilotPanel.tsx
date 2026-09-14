import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOkrDraft } from "@/hooks/useOkrDraft";
import type { OkrDraft } from "@/lib/okr/draft-contract";

interface Props {
  /** Chamado com a proposta validada — quem preenche o formulário é o diálogo. */
  onAplicar: (draft: OkrDraft) => void;
  /** A proposta que já foi aplicada, para mostrar o que ficou pendente. */
  aplicado: OkrDraft | null;
  disabled?: boolean;
}

/**
 * Campo de texto que vira OKR.
 *
 * Fica dentro do diálogo que já existe: o formulário continua sendo o produto,
 * isto é um atalho para chegar nele preenchido. Nada é salvo daqui.
 */
/**
 * Enquanto a chave da API não estiver nos secrets, o copiloto não aparece —
 * botão que só sabe dizer "não configurado" é pior que botão nenhum.
 */
const COPILOTO_LIGADO = import.meta.env.VITE_COPILOT_ENABLED === "true";

export function OkrCopilotPanel({ onAplicar, aplicado, disabled }: Props) {

  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const draft = useOkrDraft();

  const gerar = () => {
    draft.mutate(texto.trim(), { onSuccess: onAplicar });
  };

  const curto = texto.trim().length < 20;

  // Depois dos hooks: sair antes mudaria a ordem deles entre renders.
  if (!COPILOTO_LIGADO) return null;

  if (!aberto && !aplicado) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3.5 py-3 text-left text-sm transition-colors",
          "hover:border-primary/60 hover:bg-primary/10 disabled:opacity-50",
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="font-medium">Escrever com o copiloto</span>
          <span className="block text-xs text-muted-foreground">
            Descreva o que a área precisa alcançar e o formulário vem preenchido.
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Copiloto de OKR</span>
        {aplicado && (
          <Badge variant="secondary" className="ml-auto text-[10px]">
            proposta aplicada · revise antes de salvar
          </Badge>
        )}
      </div>

      {!aplicado && (
        <>
          <Textarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={draft.isPending}
            className="resize-none bg-background text-sm"
            placeholder={
              "Ex.: Precisamos baixar o custo de aquisição no modelo atual sem perder volume. " +
              "CPMQL tem que ficar abaixo de R$ 500 e o CAC não pode passar de R$ 12 mil. " +
              "O no-show de reuniões também está alto."
            }
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              O texto vira rascunho. Você revisa e salva.
            </span>
            <Button type="button" size="sm" onClick={gerar} disabled={curto || draft.isPending}>
              {draft.isPending ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Escrevendo…</>
              ) : (
                <><Sparkles className="mr-2 h-3.5 w-3.5" />Gerar proposta</>
              )}
            </Button>
          </div>
        </>
      )}

      {/* O que o copiloto não soube: some quando a pessoa responde no formulário. */}
      {aplicado && aplicado.perguntas.length > 0 && (
        <div className="space-y-1.5">
          {aplicado.perguntas.map((p, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {p}
            </p>
          ))}
        </div>
      )}

      {aplicado && aplicado.avisos.length > 0 && (
        <div className="space-y-1.5">
          {aplicado.avisos.map((a, i) => (
            <p
              key={i}
              className={cn(
                "flex items-start gap-2 text-xs",
                a.severidade === "alta" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span><span className="font-medium">{a.campo}:</span> {a.texto}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
