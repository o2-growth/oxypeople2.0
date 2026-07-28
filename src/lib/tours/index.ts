import type { DriveStep } from "driver.js";

/**
 * Definições dos tours de primeiro acesso (Onda 3 — §3.7).
 *
 * Cada tour tem um ID versionado (`:v1`) que é usado LITERALMENTE como chave da
 * flag "já visto" em `localStorage` (uma por tour). Subir a versão no futuro
 * (`:v2`) re-exibe o tour para todos sem apagar dado à mão.
 *
 * Regra de alvos: preferir SELETORES ESTÁVEIS já existentes; `data-tour="..."`
 * só onde não havia âncora confiável. Passo sem `element` é exibido centralizado
 * (intro). Passo com alvo ausente é PULADO pelo hook (`skipMissingElement`).
 */

export const OKR_OVERVIEW_TOUR_ID = "tour:okr-overview:v1";
export const ONBOARDING_TOUR_ID = "tour:onboarding:v1";

// Tour 1 — Acompanhamento de OKRs (Vini / gestores / admin).
// Alvos via `data-tour` adicionados no próprio OkrOverview.tsx.
export const okrOverviewSteps: DriveStep[] = [
  {
    popover: {
      title: "Acompanhamento de OKRs",
      description:
        "Visão consolidada do progresso por área e time — o ponto de partida para a cobrança e as reuniões de resultado.",
    },
  },
  {
    element: '[data-tour="okr-period"]',
    popover: {
      title: "Período",
      description:
        "Escolha o trimestre/ciclo aqui. Todo o painel recalcula para o período selecionado.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="okr-summary"]',
    popover: {
      title: "Resumo consolidado",
      description:
        "Áreas, times, Key Results e o progresso médio de tudo que está em acompanhamento neste período.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="okr-area"]',
    popover: {
      title: "Card de área",
      description:
        "Cada área traz o dono, os times e o rollup do progresso (média ponderada dos filhos). Clique no título para abrir o objetivo.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="okr-progress"]',
    popover: {
      title: "Real x esperado",
      description:
        "A parte preenchida é o progresso real; o traço marca o esperado pelo ritmo do período. Traço em alerta = a área está atrás do esperado.",
      side: "top",
      align: "start",
    },
  },
];

// Tour 2 — Primeiro acesso do colaborador (a partir da Home / Meu Dia).
// Alvos preferem seletores já existentes:
//   - `[data-sidebar="content"]`  → menu por papel (AppSidebar via shadcn Sidebar)
//   - `section[aria-label="Meu Dia"]` → painel de check-ins/1:1/feedbacks (MyDayPanel)
//   - `[data-tour="pulse"]` → card do Pulse (PulseWidget se auto-oculta; o passo
//                             é pulado quando não há Pulse ativo).
export const onboardingSteps: DriveStep[] = [
  {
    popover: {
      title: "Bem-vindo(a) ao Oxy People 👋",
      description:
        "Um tour rápido de 3 passos para você começar. Pode pular a qualquer momento.",
    },
  },
  {
    element: '[data-sidebar="content"]',
    popover: {
      title: "Seu menu",
      description:
        "Organizado por contexto: Início e Meu Espaço para o seu dia a dia — e, se você lidera um time, também Meu Time e Organização.",
      side: "right",
      align: "start",
    },
  },
  {
    element: 'section[aria-label="Meu Dia"]',
    popover: {
      title: "Faça um check-in",
      description:
        "No Meu Dia ficam seus check-ins pendentes, a próxima 1:1 e feedbacks a responder. Comece atualizando um Key Result em Ver objetivos.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="pulse"]',
    popover: {
      title: "Responda o Pulse",
      description:
        "Quando houver um Pulse ativo, ele aparece aqui na Home. Leva segundos e ajuda a empresa a te ouvir.",
      side: "bottom",
      align: "start",
    },
  },
];
