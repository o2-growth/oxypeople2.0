# Oxy People — Guia do Usuário

> Plataforma de gestão de pessoas da O2 Inc. — objetivos, feedback, desenvolvimento, reconhecimento e muito mais.

---

## Índice

- [Visão Geral](#visão-geral)
- [Acesso](#acesso)
- [Níveis de Permissão](#níveis-de-permissão)
- [Dashboard](#dashboard)
- [Mural](#mural)
- [Meu Espaço](#meu-espaço)
- [Feedback](#feedback)
- [Desenvolvimento](#desenvolvimento)
- [Gestão](#gestão-gestores-e-admins)
- [Administração](#administração-admins-e-proprietários)
- [Configurações](#configurações)

---

## Visão Geral

O **Oxy People** é a plataforma central de gestão de pessoas da O2 Inc. Ela reúne num único lugar:

- Gestão de **OKRs e objetivos** em cascata
- Ciclos de **avaliação de desempenho**
- Fluxos de **feedback** entre colaboradores
- **PDI** — Plano de Desenvolvimento Individual
- **1:1s** — reuniões individuais entre gestor e liderado
- **Reconhecimentos** entre colegas
- **Gamificação** com pontos, níveis e ranking
- **Pesquisas** de clima (eNPS e GPTW)
- **Organograma** interativo por áreas, times e colaboradores
- **Mural** de comunicados e eventos da empresa
- Painel de **RH** com headcount, turnover e relatórios

---

## Acesso

Acesse pelo link fornecido pela sua empresa. Na primeira vez, use as credenciais enviadas por e-mail. Caso precise redefinir sua senha, clique em **"Esqueci minha senha"** na tela de login.

---

## Níveis de Permissão

| Nível | Quem é | O que acessa |
|---|---|---|
| **Colaborador** | Todos os usuários | Dashboard, Mural, Meu Espaço, Feedback, PDI, 1:1s, Reconhecimentos, Gamificação |
| **Gestor** | Líderes de time | Tudo acima + Gestão de times, PDI do Time, painel de 1:1s |
| **Admin** | Administradores de RH | Tudo acima + RH completo, Empresa, Automação, Pesquisas, convites |
| **Proprietário** | Donos da conta | Tudo acima + link para o repositório no GitHub |

---

## Dashboard

**Rota:** `/`

Página inicial personalizada com visão geral da empresa e do colaborador:

- **Cards de resumo** — total de colaboradores, reconhecimentos, objetivos ativos e engajamento
- **Status dos OKRs** — progresso médio dos objetivos do trimestre
- **Gráfico de engajamento** — evolução ao longo do tempo
- **Aniversariantes** — colaboradores fazendo aniversário no mês
- **Top Reconhecidos** — ranking de quem mais recebeu reconhecimentos
- **Gamificação** — seus pontos e nível atual
- **Turnover** — indicador rápido de saídas
- **Pesquisa Pulse** — última pergunta de clima disponível
- **Ações rápidas** — atalhos para as ações mais comuns

---

## Mural

**Rota:** `/feed`

Central de comunicação da empresa:

- **Eventos em destaque** — carrossel com os próximos eventos
- **Comunicados fixados** — avisos importantes destacados pelos admins
- **Calendário** — mini calendário com datas relevantes
- **Aniversários do mês** — lista de colaboradores
- **Destaques do mês** — highlights selecionados pelos admins

> Admins podem criar e fixar eventos e comunicados diretamente nessa tela.

---

## Meu Espaço

### Sobre mim — `/feedback/about-me`

Exibe os feedbacks que colegas escolheram compartilhar explicitamente com você. Se você for gestor, também exibe feedbacks compartilhados sobre membros do seu time.

### Objetivos — `/objectives`

Gestão de OKRs em três visualizações:

- **Árvore** — hierarquia completa de objetivos e key results
- **Mapa** — visão canvas dos OKRs em cascata
- **Ações (Kanban)** — tarefas derivadas dos objetivos no formato board

**Criar objetivo:** clique em **"+ Novo Objetivo"**. Defina tipo (empresa, área, time ou individual), período, owner e descrição. Você pode criar key results vinculados e quebrar objetivos em sub-objetivos.

**Filtros disponíveis:** por área, por time, por colaborador, por período e por tipo de objetivo.

### Desempenho — `/performance`

Ciclos de avaliação de performance:

- Veja os ciclos ativos e seus status
- Responda avaliações pendentes no prazo
- Acompanhe avaliações concluídas e scores

Admins configuram os ciclos (datas, participantes, critérios). Colaboradores respondem as avaliações no prazo definido.

### Gamificação — `/gamification`

Sistema de pontos e recompensas:

- **Seus pontos** e nível atual
- **Ranking geral** — posição entre todos os colaboradores
- **Histórico de pontos** — quando e por que você ganhou pontos
- **Progresso de níveis** — o que falta para o próximo nível

Pontos são acumulados por ações na plataforma: dar feedback, completar avaliações, atingir objetivos, reconhecer colegas, entre outras.

### Reconhecimentos — `/recognition`

Envie e receba reconhecimentos públicos:

- **Feed** — todos os reconhecimentos da empresa
- **Recebidos** — reconhecimentos que você recebeu
- **Enviados** — reconhecimentos que você enviou
- **Ranking** — quem mais recebeu reconhecimentos

Para enviar: clique em **"Reconhecer colega"**, escolha a pessoa, a competência relacionada e escreva uma mensagem.

---

## Feedback

### Inbox — `/feedback/inbox`

Pedidos de feedback que chegaram para **você responder**. Cada card mostra quem pediu, a pergunta e o prazo. Clique em **"Responder"** para abrir o formulário.

### Pedir feedback — `/feedback/new`

Solicite feedback de colegas sobre você:

1. Escolha a pessoa (ou pessoas)
2. Selecione ou escreva a pergunta
3. Defina a visibilidade da resposta (só você, compartilhar com gestor, etc.)
4. Envie

### Enviados — `/feedback/sent`

Histórico de todos os pedidos de feedback que você enviou, com status de cada um (pendente / respondido).

---

## Desenvolvimento

### PDI — `/pdi`

Plano de Desenvolvimento Individual:

- **Criar PDI:** defina título, descrição, prazo e competências a desenvolver
- **Acompanhar progresso:** cada PDI mostra % de conclusão e status (rascunho, ativo, concluído, cancelado)
- **Ações de desenvolvimento:** dentro de cada PDI, adicione tarefas concretas com prazo e responsável
- **Aprovação:** PDIs passam por fluxo de aprovação pelo gestor antes de ser ativados

### 1:1s — `/one-on-ones`

Reuniões individuais com seu gestor ou liderado:

- **Agendar:** data, horário, duração e local (presencial ou remoto)
- **Recorrência:** configure reuniões recorrentes (semanal, quinzenal, mensal)
- **Agenda:** adicione tópicos antes da reunião
- **Registro:** durante ou após a reunião, registre anotações e próximos passos
- **Histórico:** veja o registro de todas as reuniões passadas

---

## Gestão (gestores e admins)

### RH — `/hr`

Central de gestão de pessoas com abas:

| Aba | O que mostra |
|---|---|
| **Dashboard** | Headcount, métricas de admissão/saída e indicadores de RH |
| **Colaboradores** | Lista completa com filtros por área, time e status |
| **Organograma** | Árvore visual de áreas e times |
| **Turnover** | Gráfico de entradas e saídas por período |
| **Calendário** | Aniversários, datas de admissão e eventos de RH |
| **Relatórios** | Exportação de dados de colaboradores |
| **Feedback** | Visão consolidada de feedbacks do time |
| **NPS Interno** | Resultados de eNPS por colaborador |

**Organograma:** alterne entre:
- **Áreas e Times** — estrutura de departamentos e times (com visão lista ou visual)
- **Colaboradores** — hierarquia por gestor (com visão lista ou visual)

No modo **Visual (organograma)**, navegue pelo mapa interativo, use a miniatura no canto inferior direito e exporte como PNG.

No modo **Lista (árvore)**, admins podem arrastar colaboradores para reorganizar a hierarquia de gestores.

### Times — `/teams`

Gerencie times e membros (restrito a admins):

- Criar, editar e excluir times
- Adicionar e remover membros
- Definir líderes de time

### Pesquisas — `/surveys`

Dois tipos de pesquisa de clima:

**eNPS (Employee Net Promoter Score)**
- Pergunta: *"De 0 a 10, quanto você recomendaria esta empresa como lugar para trabalhar?"*
- Resultado: score NPS calculado automaticamente (Promotores − Detratores)

**GPTW (Great Place to Work)**
- Questionário multi-item sobre cultura, confiança e ambiente de trabalho
- Resultados consolidados por dimensão

Admins criam e publicam pesquisas. Colaboradores respondem quando há uma pesquisa ativa.

### PDI do Time — `/pdi/team`

Painel consolidado dos PDIs de todos os membros do time que você gerencia. Veja status, progresso e pendências de aprovação.

### 1:1s Gestão — `/admin/one-on-ones-dashboard`

Visão geral de todas as reuniões 1:1 dos times que você gerencia: quem tem reuniões agendadas, frequência e histórico.

---

## Administração (admins e proprietários)

### Empresa — `/company`

Configurações gerais da empresa:

- **Membros** — lista completa, convites pendentes, edição de perfil e remoção
- **Áreas** — criar e gerenciar áreas com cor de identificação
- **Convidar** — enviar convites por e-mail com perfil e nível de permissão definidos

### Automação — `/automation`

- **Avisos** — crie comunicados internos que aparecem no Mural
- **Automações** — regras automáticas (ex: notificação de aniversário, lembrete de objetivo)
- **Histórico** — log de todas as automações executadas

---

## Configurações

**Rota:** `/settings`

Acesse pelo menu no canto inferior esquerdo (clique no seu nome/avatar):

- Editar nome, foto de perfil e dados pessoais
- Alterar senha
- Alternar entre tema claro e escuro

---

## Versão

A versão atual da aplicação aparece no canto inferior esquerdo do menu lateral, acima do nome do usuário. Proprietários podem clicar na versão para acessar este repositório no GitHub.

---

*Oxy People — by O2 Inc.*
