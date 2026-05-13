import type { PDICompetency } from "@/hooks/usePDICompetencies";

interface Props {
  competencies: PDICompetency[];
}

export function CompetencyTable({ competencies }: Props) {
  return (
    <table className="sr-only">
      <caption>Mapa de competências</caption>
      <thead>
        <tr>
          <th>Competência</th>
          <th>Nível Atual</th>
          <th>Nível Alvo</th>
          <th>Gap</th>
        </tr>
      </thead>
      <tbody>
        {competencies.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{c.current_level}/5</td>
            <td>{c.target_level}/5</td>
            <td>{c.target_level - c.current_level}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
