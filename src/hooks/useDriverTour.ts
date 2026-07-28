import { useCallback, useEffect, useMemo, useRef } from "react";
import { driver, type Config, type DriveStep, type Driver, type PopoverDOM } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Wrapper fino sobre o driver.js (Onda 3 — §3.7, veredito "ADOTAR JÁ" de
 * libraries.md). A lib tem API imperativa; este hook a integra ao React e
 * padroniza:
 *
 * - Botões em pt-BR (Próximo / Anterior / Concluir / Pular).
 * - Fecha no Esc e no clique do overlay (`allowClose` + `overlayClickBehavior`).
 * - Alvo ausente é PULADO (`skipMissingElement`) — passos cujo elemento não
 *   existe (ex.: Pulse já respondido, painel sem áreas) simplesmente somem, o
 *   que mantém os tours ADITIVOS e SKIPÁVEIS: nunca bloqueiam nem quebram a UI.
 * - Flag "já visto" em `localStorage`, UMA por tour (a chave É o `tourId`, que
 *   já vem versionado, ex.: `tour:okr-overview:v1`). Um `start()` autônomo não
 *   roda para quem já viu; um `start({ force: true })` re-exibe sob demanda.
 *
 * Os tours são puramente cosméticos: se o `localStorage` falhar (modo privado)
 * ou o driver.js não montar, a aplicação segue funcionando normalmente.
 */

export type UseDriverTourOptions = Omit<Config, "steps"> & {
  /** Chamado quando o tour termina — por conclusão, "Pular", Esc ou overlay. */
  onFinish?: () => void;
};

export interface DriverTourControls {
  /** Inicia o tour. Respeita a flag "já visto"; `force` re-exibe mesmo assim. */
  start: (options?: { force?: boolean }) => void;
  /** `true` se este tour já foi exibido para o usuário neste navegador. */
  hasSeen: () => boolean;
  /** Marca como visto sem exibir (raro; a exibição já marca sozinha). */
  markSeen: () => void;
  /** Limpa a flag "já visto" (permite re-tour). */
  reset: () => void;
  /** `true` enquanto o tour estiver ativo na tela. */
  isActive: () => boolean;
}

function readSeen(tourId: string): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(tourId) === "1";
  } catch {
    return false;
  }
}

function writeSeen(tourId: string): void {
  try {
    window.localStorage.setItem(tourId, "1");
  } catch {
    /* storage indisponível (modo privado/desabilitado) — tour é opcional. */
  }
}

function clearSeen(tourId: string): void {
  try {
    window.localStorage.removeItem(tourId);
  } catch {
    /* idem writeSeen */
  }
}

// Injeta um botão "Pular" (pt-BR) no rodapé do popover. O driver.js só oferece
// o "×" de canto para fechar; escondemos esse "×" (via `showButtons`) e
// colocamos um "Pular" textual e explícito, mais claro para onboarding.
function injectSkipButton(popover: PopoverDOM, onSkip: () => void): void {
  const footer = popover.footer;
  if (!footer || footer.querySelector(".driver-skip-btn")) return;
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "driver-skip-btn";
  skip.textContent = "Pular";
  skip.setAttribute("aria-label", "Pular tour");
  skip.style.cssText =
    "all:unset;cursor:pointer;color:#727272;font-size:13px;line-height:1.3;text-decoration:underline;";
  skip.addEventListener("click", onSkip);
  footer.insertBefore(skip, footer.firstChild);
}

export function useDriverTour(
  tourId: string,
  steps: DriveStep[],
  opts: UseDriverTourOptions = {},
): DriverTourControls {
  const driverRef = useRef<Driver | null>(null);
  // Refs p/ ler os valores mais recentes sem recriar `start` a cada render.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const hasSeen = useCallback(() => readSeen(tourId), [tourId]);
  const markSeen = useCallback(() => writeSeen(tourId), [tourId]);
  const reset = useCallback(() => clearSeen(tourId), [tourId]);

  const start = useCallback(
    (options?: { force?: boolean }) => {
      if (typeof window === "undefined") return;
      const force = options?.force ?? false;
      // Auto-start respeita a flag; um start explícito (`force`) sobrepõe.
      if (!force && readSeen(tourId)) return;

      const currentSteps = stepsRef.current;
      if (!currentSteps.length) return;

      // Encerra qualquer instância anterior (evita overlays sobrepostos).
      driverRef.current?.destroy();

      const { onFinish, onPopoverRender, onDestroyed, ...rest } = optsRef.current;

      const d = driver({
        showProgress: true,
        progressText: "{{current}} de {{total}}",
        nextBtnText: "Próximo",
        prevBtnText: "Anterior",
        doneBtnText: "Concluir",
        allowClose: true, // Esc + clique no overlay encerram o tour.
        overlayClickBehavior: "close",
        smoothScroll: true,
        skipMissingElement: true, // alvo ausente → passo é pulado (não quebra).
        // "×" de canto oculto; usamos o "Pular" textual injetado no rodapé.
        showButtons: ["next", "previous"],
        steps: currentSteps,
        ...rest,
        onPopoverRender: (popover, hookOpts) => {
          injectSkipButton(popover, () => d.destroy());
          onPopoverRender?.(popover, hookOpts);
        },
        onDestroyed: (element, step, hookOpts) => {
          onDestroyed?.(element, step, hookOpts);
          onFinish?.();
        },
      });

      driverRef.current = d;
      // "Já visto" assim que o tour aparece — mesmo que o usuário pule depois,
      // não o incomodamos de novo no próximo acesso.
      writeSeen(tourId);
      d.drive();
    },
    [tourId],
  );

  // Ao desmontar (troca de rota), garante que nenhum overlay fique preso.
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  return useMemo<DriverTourControls>(
    () => ({
      start,
      hasSeen,
      markSeen,
      reset,
      isActive: () => driverRef.current?.isActive() ?? false,
    }),
    [start, hasSeen, markSeen, reset],
  );
}
