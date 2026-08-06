import { cn } from "@/lib/utils";

interface TextoFormatadoProps {
  children: string | null | undefined;
  className?: string;
}

/**
 * Texto de várias linhas com o espaçamento que quem escreveu pretendeu.
 *
 * Um `<p>` comum colapsa toda quebra de linha em espaço: a descrição do ciclo
 * de avaliação, escrita com parágrafos separados e uma lista de etapas, virava
 * um paredão único onde ninguém achava a data.
 *
 * Linha em branco separa parágrafo — vira espaçamento de verdade, não uma linha
 * vazia. Quebra simples separa itens de uma lista e fica colada, como no
 * original. É o mesmo comportamento do Slack, que é onde esses textos nascem.
 */
export function TextoFormatado({ children, className }: TextoFormatadoProps) {
  const texto = children?.trim();
  if (!texto) return null;

  const paragrafos = texto.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <div className={cn("space-y-3", className)}>
      {paragrafos.map((p, i) => (
        <p key={i} className="whitespace-pre-line leading-relaxed">
          {p.trim()}
        </p>
      ))}
    </div>
  );
}
