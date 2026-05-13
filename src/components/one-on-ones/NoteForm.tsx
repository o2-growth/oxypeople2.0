import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { NoteVisibility } from "@/hooks/useOneOnOneNotes";

const schema = z.object({
  content: z.string().min(1, "Escreva algo antes de salvar.").max(10000),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  visibility: NoteVisibility;
  onSubmit: (content: string) => void;
  isSubmitting: boolean;
  placeholder?: string;
}

export function NoteForm({ visibility: _visibility, onSubmit, isSubmitting, placeholder }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = (values: FormValues) => {
    onSubmit(values.content);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-2 pt-2">
      <Textarea
        {...register("content")}
        placeholder={placeholder ?? "Adicionar nota..."}
        className="text-sm min-h-[80px] resize-none"
        maxLength={10000}
        disabled={isSubmitting}
      />
      {errors.content && (
        <p className="text-xs text-destructive">{errors.content.message}</p>
      )}
      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={isSubmitting} className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Salvar nota
        </Button>
      </div>
    </form>
  );
}
