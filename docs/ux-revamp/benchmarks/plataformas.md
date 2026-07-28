# Benchmark de Plataformas Comerciais — Gestão de Pessoas & Performance

> Pesquisa de apoio ao revamp de UX do OxyPeople. Fontes via busca web (sites oficiais, help centers, G2/Capterra/TrustRadius/Reclame Aqui). Datas de acesso: jul/2026.

---

## 1. Feedz (TOTVS)

**Módulos oferecidos**
- Performance/OKR ("Metas e Objetivos") — metas por pessoa, time e empresa, planos de ação vinculados a objetivos estratégicos
- Feedback contínuo
- 1:1
- PDI (Plano de Desenvolvimento Individual)
- Pesquisas de clima organizacional via Pulses / eNPS
- Termômetro emocional (mood check)
- Reconhecimento com painel de elogio público, gamificado
- Mapeamento comportamental (perfil comportamental do colaborador)
- Organograma da empresa

**Arquitetura de navegação**
- **Mural do Gestor**: painel consolidado que mostra as atividades e o progresso de metas de todos os subordinados diretos em um único lugar (visão de gestor).
- **Jornada do Colaborador**: perfil público que centraliza indicadores históricos do próprio colaborador — humor médio, PDIs e feedbacks recebidos ao longo do tempo (visão de colaborador/histórico).
- Organograma navegável: clicar em um nome abre o perfil público da pessoa (e-mail, ramal etc.), reforçando transparência organizacional.
- Produto originalmente vendido como plataforma standalone (Feedz), hoje reembalado como módulo "TOTVS RH" dentro da suíte TOTVS RM/Protheus — a navegação tende a herdar padrões do ecossistema TOTVS mais amplo.

**Padrões de UX/UI notáveis**
1. **Mural do Gestor** — dashboard único de gestor agregando progresso de metas de todo o time, reduzindo a necessidade de entrar em cada pessoa individualmente.
2. **Jornada do Colaborador** — timeline/perfil que junta PDI + feedback + humor em um só lugar, dando contexto histórico rico sem navegar entre módulos.
3. Organograma clicável com abertura direta de perfil público — bom padrão de "wayfinding" social dentro da ferramenta.
4. Gamificação do reconhecimento (elogio público) como mecanismo de engajamento contínuo, não apenas registro burocrático.

**Fraqueza conhecida**
- Reclamações recorrentes no Reclame Aqui sobre suporte (esperas longas, tickets levando dias/semanas para resposta), dificuldade para cancelamento de contrato sem abrir chamado, falta de transparência comercial/comunicação, e problemas de performance após migrações/atualizações na suíte TOTVS. Não foram encontradas críticas específicas e recorrentes sobre a interface do produto Feedz em si (a maior parte das queixas é comercial/suporte, não de UX).

Fontes: [TOTVS RI — M&A Feedz](https://ri.totvs.com/ma-totvs-adquire-feedz-e-amplia-atuacao-na-gestao-da-experiencia-humana/) · [TOTVS RH Metas e Objetivos (OKR)](https://www.totvs.com/rh/metas-objetivos-okr/) · [Ficha técnica TOTVS RH Metas e Objetivos – Linha Feedz](https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-rh-metas-e-objetivos-linha-feedz/) · [Reclame Aqui — Cancelamento Feedz](https://www.reclameaqui.com.br/totvs/cancelamento-da-plataforma-feedz_xAiWtWuE0J6HC-JW/) · [Reclame Aqui — Ajuste de contrato Feedz](https://www.reclameaqui.com.br/totvs/ajuste-de-contrato-l-falta-de-retorno-e-resolucao-l-feedz-by-totvs_2tR-5rlUHDB3vWy6/)

---

## 2. Qulture.Rocks

**Módulos oferecidos**
- Feedback
- 1:1 (com módulo de Liderança associado)
- OKRs / Metas
- Avaliações de performance (ciclos de avaliação)
- PDI
- Pesquisas / pulse de sentimento (clima, eNPS)

**Arquitetura de navegação**
- Não foi possível confirmar em detalhe a estrutura exata de menus (a busca não retornou screenshots/documentação de navegação oficial). Usuários descrevem a ferramenta como "intuitiva e visual", mas mencionam que "algumas funções ficam em lugares pouco intuitivos" e que falta usar campos customizados diretamente como filtro (é preciso criar tags como workaround).
- Módulos de Feedback, PDI, 1:1 e Liderança aparecem integrados ao fluxo diário de trabalho (mencionados juntos pelos usuários como um conjunto coeso).

**Padrões de UX/UI notáveis**
1. Implementação de OKR deliberadamente **menos complexa** que concorrentes internacionais (Lattice/Leapsome) — foco em simplicidade de configuração para times brasileiros que estão começando com OKR.
2. Acompanhamento de OKR via check-ins recorrentes (reuniões de check-in dedicadas ou dentro do 1:1), conectando diretamente OKR → conversa de gestão → feedback.
3. Integração dos módulos Feedback + PDI + 1:1 + Liderança no dia a dia, formando uma "rotina de gestão" única em vez de módulos isolados.
4. Integrações nativas com Slack citadas como diferencial de UX (feedback/reconhecimento aparecendo onde o time já trabalha).

**Fraqueza conhecida**
- OKRs pouco flexíveis: se um objetivo é criado incorretamente, o usuário precisa **apagar e recriar** em vez de editar/migrar.
- Módulo de pesquisas é limitado na criação de modelos de pesquisa diversos e na extração de dados (exportação de resultados fraca).
- Suporte relatado como lento para responder a erros da plataforma, sem explicações adequadas.
- Filtragem de colaboradores por campos customizados não é direta — depende de tags.

Fontes: [Qulture.Rocks Reviews — Capterra](https://www.capterra.com/p/192315/Qulture-Rocks/reviews/) · [Capterra página 4](https://www.capterra.com/p/192315/Qulture-Rocks/reviews/?page=4) · [Capterra página 6](https://www.capterra.com/p/192315/Qulture-Rocks/reviews/?page=6) · [Reclame Aqui — Qulture Rocks](https://www.reclameaqui.com.br/empresa/qulture-rocks/)

---

## 3. Lattice

**Módulos oferecidos**
- Goals/OKRs
- Performance Reviews (360°, project-based)
- 1:1s
- Feedback contínuo e reconhecimento público
- Engagement surveys (pesquisas de engajamento)
- Compensation (gestão de remuneração)
- Grow (desenvolvimento de carreira)
- Analytics/People data (camada de HRIS)

**Arquitetura de navegação**
- Filosofia central: OKRs não vivem em um módulo isolado — são **injetados nos momentos do dia a dia** (1:1s, status updates, ciclos de performance/check-ins), aparecendo como contexto dentro de outras telas em vez de exigirem navegação própria constante.
- Passou por um redesign recente de "Goals & OKRs UI/UX" em fases: fase 2 trouxe um **side panel** mais flexível para visualizar/atualizar/concluir metas; fase 3 (Milestone 3) trouxe uma **tela de detalhe em full-screen** para metas + ferramentas de atualização em massa para admins, com hierarquia mais clara.

**Padrões de UX/UI notáveis**
1. **Tree view de alinhamento** — visualização em árvore mostrando como metas individuais se conectam a metas de time e da empresa (cascata de objetivos).
2. **OKRs contextualizados** dentro de 1:1s e ciclos de review — o objetivo aparece como item de pauta/contexto na conversa de gestão, não como tela separada a ser lembrada.
3. **Side panel de edição rápida** para atualizar progresso de uma meta sem sair da tela atual (reduz fricção de update).
4. Dashboards de status em tempo real no nível de time/empresa com barras de progresso visuais.

**Fraqueza conhecida**
- Reviewers relatam navegação confusa e pouco intuitiva, exigindo passos extras para completar tarefas; navegação de OKR é descrita como "cumbersome" (trabalhosa) para rastrear e atualizar objetivos e resultados-chave.
- Preço: modelo modular "a la carte" com piso de US$ 4.000/ano mesmo para times pequenos, e custo por usuário pode passar de US$ 20/mês na suíte completa — citado como proibitivo para startups/times pequenos.

Fontes: [Lattice — Goals](https://lattice.com/platform/goals) · [Lattice — OKRs](https://lattice.com/platform/goals/okrs) · [Lattice — Product Updates Set/2025](https://lattice.com/blog/september-2025-product-updates) · [G2 — Lattice Reviews](https://www.g2.com/products/lattice-lattice/reviews) · [Tability — Lattice Review](https://www.tability.io/compare/platform/lattice)

---

## 4. Leapsome

**Módulos oferecidos**
- Performance Reviews + 360° feedback
- Goals & OKRs (com goal trees)
- Engagement surveys
- 1:1s e reuniões de time
- Feedback instantâneo
- Learning (LMS: trilhas de aprendizagem, onboarding automatizado, SCORM/AICC/xAPI/CMI5, integrações LinkedIn Learning/GoodHabitz)
- Compensation
- Q&A boards / competency frameworks
- IA (Leapsome AI Agents), analytics, form builder, 70+ integrações

**Arquitetura de navegação**
- **Home Dashboard**: ponto único de entrada para todos os usuários (via login ou aba "Home").
- **Team Overview Dashboard**: tela dedicada para gestores, consolidando de forma resumida performance, progresso de metas e engajamento de todo o time em um só painel; permite pular direto para o perfil de cada liderado.
- Para admins: navegação via **Company → Employees** (gestão de usuários, edição de papéis/role, org chart em **Company → Employees → Org Chart**).
- Acesso por papel dinâmico: um gestor só visualiza os atributos/dados dos membros do próprio time (permissão contextual, não papel fixo).
- Sidebar colapsável para maximizar espaço em telas com muitos dados.

**Padrões de UX/UI notáveis**
1. **Goal trees** com progresso calculado automaticamente por rollup (meta-pai reflete o progresso das metas-filhas) + integração com Jira.
2. **Team Overview Dashboard do gestor** — um único painel reunindo performance + metas + engajamento do time (evita a necessidade de abrir 3 telas separadas).
3. **Metas de desenvolvimento conectadas diretamente às performance reviews** — fecha o loop entre avaliação e plano de crescimento (o PDI nasce do resultado da review).
4. Suíte de Talento unificada: reviews, pesquisas, metas, aprendizagem e compensação sob uma mesma navegação/IA, em vez de produtos isolados costurados por integração.

**Fraqueza conhecida**
- Usuários relatam dificuldade em localizar dados específicos dentro da ferramenta ("hard to locate the data they need").
- Atualização de metas ainda exige edição manual (não totalmente automatizada em todos os cenários).
- Modelo de preço "pune" empresas em crescimento — o que é razoável com 10 funcionários vira um peso orçamentário conforme o headcount cresce.
- App mobile com funcionalidade limitada; carregamento do site descrito como "meio truncado" por alguns usuários.

Fontes: [Leapsome — Information](https://www.leapsome.com/information) · [Leapsome Help — Home Dashboard](https://help.leapsome.com/hc/en-us/articles/8701421692061-Home-Dashboard) · [Leapsome Help — Employees page navigation](https://help.leapsome.com/hc/en-us/articles/17553988823197--Employees-page-navigation) · [TrustRadius — Leapsome Reviews](https://www.trustradius.com/products/leapsome/reviews?qs=pros-and-cons) · [Teamspective — Leapsome Reviews 2026](https://teamspective.com/blog/leapsome-reviews/)

---

## 5. Culture Amp

**Módulos oferecidos**
- **Engage**: pesquisas de engajamento/clima e eNPS, templates customizáveis, benchmarking com mercado, análise automática de comentários abertos via IA.
- **Perform**: avaliações de performance, feedback em tempo real, tracking de metas, "Performance Culture Quadrant" (cruzamento performance × cultura/comportamento).
- **Develop**: planos de desenvolvimento pessoal, trilhas de carreira, aprendizado contínuo.
- Action planning (transformar resultado de pesquisa em plano de ação com dono e prazo).

**Arquitetura de navegação**
- Estrutura em torno de **3 produtos/hubs principais** (Engage / Perform / Develop) com um **product switcher consistente** posicionado à esquerda da navegação, permitindo alternar de contexto sem perder o "chrome" da interface.
- Help Center espelha essa divisão: hubs temáticos "Getting Started", "Account Admin Hub", "Survey Admin Hub", "Performance Admin Hub", além de um **Participant Hub** (colaborador: participar de pesquisas, dar feedback 360, ver relatórios pessoais de desenvolvimento) e um **Manager Hub** (gestor: agir sobre resultados de pesquisa do time, gerenciar reviews dos diretos).
- Admins têm acesso completo a todos os hubs (permissões, integrações HRIS, relatórios avançados).

**Padrões de UX/UI notáveis**
1. **Product switcher Engage/Perform/Develop** — alternância clara entre os 3 grandes domínios sem fragmentar a experiência visual.
2. **Action planning integrado ao resultado da pesquisa** — a partir de um insight de eNPS/clima, o gestor cria uma ação com responsável e prazo diretamente na mesma tela.
3. Análise automática de comentários abertos (IA) sintetizando texto livre em temas recorrentes — reduz o trabalho manual de leitura de centenas de respostas.
4. **Performance Culture Quadrant** — visualização que cruza desempenho individual com comportamento/cultura, indo além do "score único" de performance.

**Fraqueza conhecida**
- Preço alto e não publicado (a partir de ~US$ 4.500/ano, dobrando facilmente ao somar performance + manager tools + analytics avançado; uma equipe de 100 pessoas facilmente ultrapassa US$ 10.000/ano) — considerado caro/complexo demais para a maioria dos times avaliando a ferramenta.
- Onboarding/implementação exige semanas de investimento real antes de gerar dados úteis.
- Sensação de plataforma "fragmentada" após anos de aquisições de produtos distintos.
- Suporte ao vivo limitado em planos mais baixos; relatórios pouco customizáveis; filtragem por gestor/região específica é trabalhosa.
- Melhor indicada para grandes empresas — pouco adequada (cara e complexa) para times pequenos/médios.

Fontes: [Culture Amp — How to Navigate](https://support.cultureamp.com/en/articles/7048506-how-to-navigate-culture-amp) · [Culture Amp — Engage](https://www.cultureamp.com/platform/engage) · [Culture Amp — Performance Culture Quadrant](https://www.cultureamp.com/platform/engage/performance-culture-quadrant) · [SelectSoftware Reviews — Culture Amp](https://www.selectsoftwarereviews.com/reviews/cultureamp) · [FeedbackPulse — Culture Amp Alternatives](https://feedbackpulse.com/culture-amp-alternatives)

---

## 6. 15Five

**Módulos oferecidos**
- Check-ins semanais com Pulse (termômetro de humor)
- 1-on-1s
- Objectives/OKRs
- Performance Reviews (com recursos de IA)
- Engagement surveys
- Coaching e treinamento de gestores
- Reconhecimento

**Arquitetura de navegação**
- Acesso ao **My Team Dashboard** (visão de gestor) via avatar no canto inferior esquerdo → aba "My team".
- **Home** pessoal como tela padrão de entrada; **Objectives Dashboard** como tela separada para metas.
- Estrutura por abas/seções (Check-ins, 1-on-1s, Objectives, Reviews) que foi crescendo ao longo do tempo até virar uma experiência "suite-like" com múltiplas áreas.

**Padrões de UX/UI notáveis**
1. **My Team Dashboard do gestor** — widgets consolidados: check-ins ainda não revisados (com atalho "Review Check-ins"), gráfico de Pulse do time (evolução do humor), 1:1s e Objectives dos liderados — um painel de ação único.
2. **Check-in semanal leve** (poucos minutos) como ritual central que alimenta o resto do produto — conquistas, desafios e humor reportados de forma recorrente e leve.
3. **Pulse embutido no check-in** ("como você se sentiu desde o último check-in?") virando gráfico de tendência automático para o gestor, sem pesquisa separada.
4. Objectives conectados aos check-ins/reviews para dar contexto contínuo às metas (em vez de um módulo isolado revisado só trimestralmente).

**Fraqueza conhecida**
- Navegação descrita como "clunky" (pouco fluida) e difícil de pesquisar — encontrar o que se procura é visto como contraintuitivo por parte dos usuários.
- Dificuldade em rastrear itens de ação (action items) ou histórico de 1:1 entre múltiplos colaboradores ao longo do tempo.
- Curva de aprendizado conforme a ferramenta se expande além de check-ins simples para uma suíte mais completa; usuários relatam demorar para achar onde ficam os relatórios analíticos mais profundos.
- Mudanças de hierarquia organizacional (gestor interino, licenças) são trabalhosas de gerenciar na ferramenta.

Fontes: [15Five — My Team Dashboard](https://success.15five.com/hc/en-us/articles/8351656194971-Use-the-My-team-Dashboard) · [15Five — Homepage for managers](https://success.15five.com/hc/en-us/articles/19793121190043-Homepage-for-managers) · [15Five — Check-ins Feature Overview](https://success.15five.com/hc/en-us/articles/50988284004635-Check-ins-Feature-Overview) · [G2 — 15Five Pros and Cons](https://www.g2.com/products/15five/reviews?page=6&qs=pros-and-cons) · [HeartCount — 15Five Review](https://heartcount.com/comparisons/15five-review-features-pros-cons-alternatives/)

---

## Síntese: 10 padrões que o OxyPeople deve adotar

Ranqueados por impacto esperado na experiência (navegação + retenção de uso), considerando o contexto do OxyPeople (substituindo o Feedz, com painel de OKR por área/time recém-lançado):

1. **Dashboard único e consolidado por papel** — um "hub" central por perfil (gestor, colaborador, admin), nos moldes do *Mural do Gestor* (Feedz), *My Team Dashboard* (15Five) e *Team Overview Dashboard* (Leapsome): check-ins pendentes, pulse do time, progresso de OKR e 1:1s agendados em um único painel de ação, sem precisar abrir tela por tela.
2. **Árvore/cascata visual de OKRs** (Lattice tree view, Leapsome goal trees, Feedz "metas por pessoa/time/empresa") — mostrar visualmente como o objetivo de um indivíduo se conecta ao do time e da empresa, com rollup automático de progresso.
3. **OKRs injetados no fluxo de trabalho, não isolados** (Lattice, 15Five, Qulture.Rocks) — objetivos aparecendo como contexto dentro do 1:1, do check-in e da review, não como módulo que exige lembrança e navegação própria.
4. **Perfil/jornada do colaborador consolidando histórico** (*Jornada do Colaborador* da Feedz) — uma timeline única por pessoa reunindo humor, PDI, feedbacks recebidos e OKRs ao longo do tempo, útil tanto para autoanálise quanto para 1:1 do gestor.
5. **Check-in leve e recorrente com pulse de humor embutido** (15Five, Feedz Termômetro Emocional) — substitui pesquisa de clima pontual por um sinal contínuo e de baixo esforço, virando gráfico de tendência automaticamente.
6. **Edição rápida via side panel / detail view sem perder contexto** (redesign recente da Lattice) — atualizar progresso de uma meta ou registrar feedback sem sair da tela atual, reduzindo fricção e cliques.
7. **Action planning conectado a resultados de pesquisa/eNPS** (Culture Amp) — transformar um insight de pesquisa diretamente em uma ação com dono e prazo, fechando o loop entre "medir" e "agir".
8. **PDI conectado diretamente à review/OKR** (Leapsome) — o plano de desenvolvimento nasce do resultado da avaliação/objetivo, não é um documento avulso e desconectado.
9. **Product switcher / navegação consistente entre grandes áreas** (Culture Amp Engage/Perform/Develop) — se o OxyPeople tiver múltiplos domínios (OKR, Pessoas, Pesquisas, Reconhecimento), manter um seletor visualmente consistente entre eles em vez de menus desconectados.
10. **Organograma navegável e clicável** (Feedz) — abrir perfil público da pessoa a partir do organograma, reforçando transparência e facilitando "wayfinding" social dentro da ferramenta.

**Armadilhas a evitar** (fraquezas identificadas): navegação confusa/com passos extras para tarefas simples (Lattice, 15Five); rigidez para editar OKR já criado, forçando apagar-e-recriar (Qulture.Rocks); custo e complexidade que afastam times pequenos (Culture Amp, Lattice); dificuldade de rastrear histórico de 1:1/PDI entre pessoas e ao longo do tempo (15Five); e suporte lento / falta de transparência comercial, que gera desconfiança independentemente da qualidade do produto (Feedz/TOTVS, Qulture.Rocks).
