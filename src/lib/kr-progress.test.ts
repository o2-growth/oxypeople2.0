import { describe, it, expect } from "vitest";
import {
  krProgress, krProgressForValue, formatKrValue, krMode, krIsMet, krIsMeasured, krModeHint,
} from "./kr-progress";

describe("krProgress (valor atual)", () => {
  it("up: proporcional entre initial e target", () => {
    expect(krProgress({ initial_value: 0, current_value: 50, target_value: 100 })).toBe(50);
    expect(krProgress({ initial_value: 20, current_value: 60, target_value: 100 })).toBe(50);
  });

  it("clampa entre 0 e 100", () => {
    expect(krProgress({ initial_value: 0, current_value: -10, target_value: 100 })).toBe(0);
    expect(krProgress({ initial_value: 0, current_value: 200, target_value: 100 })).toBe(100);
  });

  it("down: progride quando o valor cai em direção à meta", () => {
    expect(krProgress({ direction: "down", initial_value: 100, current_value: 50, target_value: 0 })).toBe(50);
  });

  it("binary: crédito parcial proporcional, 100 ao atingir a meta", () => {
    expect(krProgress({ kr_type: "binary", current_value: 0, target_value: 1 })).toBe(0);
    expect(krProgress({ kr_type: "binary", current_value: 0.4, target_value: 1 })).toBe(40);
    expect(krProgress({ kr_type: "binary", current_value: 1, target_value: 1 })).toBe(100);
    // meta 0 degenerada não divide por zero — medido, porque KR sem medição
    // nenhuma vale 0 em qualquer modo.
    expect(krProgress({ kr_type: "binary", current_value: 0, target_value: 0, last_checkin_at: "2026-09-01" })).toBe(100);
    expect(krProgress({ kr_type: "binary", current_value: 0, target_value: 0 })).toBe(0);
  });

  it("span zero: 100 se já atingiu, senão 0", () => {
    expect(krProgress({ initial_value: 100, current_value: 100, target_value: 100 })).toBe(100);
    expect(krProgress({ initial_value: 100, current_value: 50, target_value: 100 })).toBe(0);
  });

  it("aceita valores em string (vindos do backend)", () => {
    expect(krProgress({ initial_value: "0", current_value: "25", target_value: "100" })).toBe(25);
  });
});

describe("krProgressForValue (preview ao vivo antes→depois)", () => {
  const kr = { initial_value: 0, target_value: 1166, kr_type: "numeric" as const };

  it("computa o progresso para um valor candidato sem depender do atual", () => {
    expect(krProgressForValue(0, kr)).toBe(0);
    expect(krProgressForValue(583, kr)).toBe(50);
    expect(krProgressForValue(1166, kr)).toBe(100);
  });

  it("respeita direction down no preview", () => {
    const down = { initial_value: 100, target_value: 0, direction: "down" as const };
    expect(krProgressForValue(75, down)).toBe(25);
    expect(krProgressForValue(0, down)).toBe(100);
  });

  it("binário no preview: avanço parcial conta, 100 ao atingir a meta", () => {
    const bin = { initial_value: 0, target_value: 1, kr_type: "binary" as const };
    expect(krProgressForValue(0, bin)).toBe(0);
    expect(krProgressForValue(0.65, bin)).toBe(65);
    expect(krProgressForValue(1, bin)).toBe(100);
  });
});

describe("consistência entre visões — MESMA função em todo lugar", () => {
  // Cada visão (MyOkrsView, OkrOverview/CTO, board via KeyResultItem, export,
  // ProgressChart) e o preview do CheckinDialog computam o % do MESMO estado do
  // KR pela lib canônica. Estes casos travam a não-divergência entre elas.
  const cases = [
    { name: "up/numeric", kr: { kr_type: "numeric", direction: "up", initial_value: 0, target_value: 1166 }, value: 350 },
    { name: "down", kr: { kr_type: "numeric", direction: "down", initial_value: 100, target_value: 20 }, value: 60 },
    { name: "percent", kr: { kr_type: "percent", direction: "up", initial_value: 0, target_value: 100 }, value: 42 },
    { name: "currency", kr: { kr_type: "currency", direction: "up", initial_value: 1000, target_value: 5000 }, value: 3000 },
    { name: "binary", kr: { kr_type: "binary", direction: "up", initial_value: 0, target_value: 1 }, value: 1 },
    { name: "ceiling dentro", kr: { kr_type: "currency", direction: "down", initial_value: 0, target_value: 12000 }, value: 10704 },
    { name: "ceiling estourado", kr: { kr_type: "currency", direction: "down", initial_value: 0, target_value: 500 }, value: 802.86 },
  ];

  it.each(cases)(
    "preview do CheckinDialog === % canônico exibido nos mapas, mesmo estado ($name)",
    ({ kr, value }) => {
      // Preview do diálogo para o valor:
      const preview = krProgressForValue(value, kr);
      // Headline que MyOkrsView/OkrOverview/board/export mostram para o KR:
      const mapa = krProgress({ ...kr, current_value: value });
      expect(preview).toBe(mapa);
    },
  );

  it("o afterPct do preview é EXATAMENTE o % que o mapa mostrará após o check-in", () => {
    const kr = { kr_type: "numeric", direction: "up", initial_value: 0, target_value: 200 };
    const before = krProgressForValue(50, kr); // 25
    const after = krProgressForValue(100, kr); // 50
    expect(after - before).toBe(25);
    // pós-check-in (current_value := novo valor), o mapa canônico bate com o preview
    expect(krProgress({ ...kr, current_value: 50 })).toBe(before);
    expect(krProgress({ ...kr, current_value: 100 })).toBe(after);
  });
});

describe("formatKrValue", () => {
  it("currency: prefixo R$ em pt-BR", () => {
    expect(formatKrValue(1166, "currency")).toBe("R$ 1.166");
  });

  it("percent: sufixo %", () => {
    expect(formatKrValue(30, "percent")).toBe("30%");
  });

  it("numeric: mostra a unidade quando houver", () => {
    expect(formatKrValue(1166, "numeric", "leads")).toBe("1.166 leads");
    expect(formatKrValue(1166, "numeric")).toBe("1.166");
  });
});

describe("meta de teto — o valor não pode passar do limite", () => {
  // Os números são os KRs reais que o CEO apontou em 04/09/2026.
  const teto = (target: number, extra: Record<string, unknown> = {}) => ({
    kr_type: "currency", direction: "down", initial_value: 0, target_value: target,
    last_checkin_at: "2026-09-01", ...extra,
  });

  it("dentro do teto é meta batida, não 89%", () => {
    // "CAC Modelo atual < R$ 12k": 10.704 aparecia como 89%, "quase lá".
    expect(krProgress({ ...teto(12000), current_value: 10704 })).toBe(100);
    expect(krIsMet({ ...teto(12000), current_value: 10704 })).toBe(true);
    expect(krProgress({ ...teto(600), current_value: 157.3 })).toBe(100);
  });

  it("no limite exato ainda está dentro", () => {
    expect(krProgress({ ...teto(460), current_value: 460 })).toBe(100);
  });

  it("estourou: cai proporcional ao tamanho do estouro e NÃO é meta batida", () => {
    // "CPMQL < R$ 460" com 501,77 mostrava 100% batido.
    expect(krProgress({ ...teto(460), current_value: 501.77 })).toBe(92);
    // "CPMQL Modelo atual < R$ 500" com 802,86, idem.
    expect(krProgress({ ...teto(500), current_value: 802.86 })).toBe(62);
    expect(krProgress({ ...teto(500), current_value: 1500 })).toBe(33);
    expect(krProgress({ ...teto(500), current_value: 2500 })).toBe(20);
    // "Speed-to-lead SLA MQL < 5 minutes" a 1.135 minutos.
    expect(krProgress({ ...teto(5), current_value: 1135 })).toBe(0);
    for (const v of [501.77, 802.86, 1135]) {
      expect(krIsMet({ ...teto(500), current_value: v })).toBe(false);
    }
  });

  it("estouro por um centavo não vira 100 — o cap de 99 protege o invariante", () => {
    // Sem o teto de 99, 460,01 arredondaria para 100 e acenderia o check de
    // concluído num KR estourado.
    expect(krProgress({ ...teto(460), current_value: 460.01 })).toBe(99);
    expect(krIsMet({ ...teto(460), current_value: 460.01 })).toBe(false);
  });

  it("teto zero: zerou é 100, qualquer valor acima é 0", () => {
    expect(krProgress({ ...teto(0), current_value: 0 })).toBe(100);
    expect(krProgress({ ...teto(0), current_value: 3 })).toBe(0);
  });

  it("sem medição vale 0, mesmo estando abaixo do limite", () => {
    // Os 7 KRs de churn da empresa estão em 0 porque ninguém mediu — inflar
    // para 100% tiraria a pressão do check-in.
    const semCheckin = { kr_type: "percent", direction: "down", initial_value: 0, target_value: 5 };
    expect(krProgress({ ...semCheckin, current_value: 0 })).toBe(0);
    expect(krIsMeasured({ ...semCheckin, current_value: 0 })).toBe(false);
    // Valor diferente de 0 já é medição, mesmo sem check-in registrado.
    expect(krProgress({ ...semCheckin, current_value: 2.52 })).toBe(100);
  });

  it("digitar 0 no check-in é medir: o preview mostra o teto batido", () => {
    expect(krProgressForValue(0, teto(500))).toBe(100);
  });

  it("partida preenchida abaixo da meta continua sendo teto", () => {
    expect(krProgress({ ...teto(12000, { initial_value: 10704 }), current_value: 11000 })).toBe(100);
    // initial === target também é teto: não há queda a medir.
    expect(krProgress({ ...teto(500, { initial_value: 500 }), current_value: 600 })).toBe(83);
  });
});

describe("redução com ponto de partida — inalterada", () => {
  const reducao = { kr_type: "numeric", direction: "down", initial_value: 800, target_value: 500, last_checkin_at: "2026-09-01" };

  it("mede a queda do ponto de partida até a meta", () => {
    expect(krProgress({ ...reducao, current_value: 650 })).toBe(50);
    expect(krProgress({ ...reducao, current_value: 400 })).toBe(100);
    expect(krProgress({ ...reducao, current_value: 900 })).toBe(0);
  });

  it("sem medição vale 0 — antes um KR nunca medido aparecia 100%", () => {
    expect(krProgress({ ...reducao, last_checkin_at: null, current_value: 0 })).toBe(0);
  });
});

describe("krMode — o sinal do span separa teto de redução", () => {
  it("classifica os quatro modos", () => {
    expect(krMode({ kr_type: "binary", target_value: 1 })).toBe("binary");
    expect(krMode({ direction: "up", initial_value: 0, target_value: 100 })).toBe("up");
    expect(krMode({ direction: "down", initial_value: 800, target_value: 500 })).toBe("down");
    // Partida 0 (o caso dos 21 KRs da empresa) é teto, não redução.
    expect(krMode({ direction: "down", initial_value: 0, target_value: 500 })).toBe("ceiling");
    expect(krMode({ direction: "down", initial_value: 500, target_value: 500 })).toBe("ceiling");
  });

  it("binário ganha de direção: entregável não tem teto", () => {
    expect(krMode({ kr_type: "binary", direction: "down", initial_value: 0, target_value: 1 })).toBe("binary");
  });
});

describe("krIsMeasured", () => {
  it("check-in registrado ou valor diferente de zero contam como medição", () => {
    expect(krIsMeasured({ target_value: 5, current_value: 0, last_checkin_at: "2026-09-01" })).toBe(true);
    expect(krIsMeasured({ target_value: 5, current_value: 2.5 })).toBe(true);
    expect(krIsMeasured({ target_value: 5, current_value: 0 })).toBe(false);
    expect(krIsMeasured({ target_value: 5, current_value: null })).toBe(false);
  });
});

describe("krModeHint — a ajuda do formulário", () => {
  it("explica o modo teto com o valor que está na tela", () => {
    expect(krModeHint({ kr_type: "currency", direction: "down", initial_value: 0, target_value: 500 }))
      .toContain("em até R$ 500");
  });

  it("explica o modo redução com a partida e a meta", () => {
    const hint = krModeHint({ kr_type: "numeric", direction: "down", initial_value: 800, target_value: 500 });
    expect(hint).toContain("800");
    expect(hint).toContain("500");
  });

  it("não atrapalha quem só quer subir", () => {
    expect(krModeHint({ direction: "up", initial_value: 0, target_value: 100 })).toBeNull();
  });
});
