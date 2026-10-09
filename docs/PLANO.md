# Plano das próximas versões

Pedidos de 09/10/2026, na ordem em que devem ser feitos. Cada etapa vira uma versão (1.0.22, 1.0.23...).

## 0. Antes de tudo: nuvem funcionando (sem código)
- Supabase → Authentication → Sign In / Providers → **Email** → ligar "Enable Email provider" (está DISABLED) e deixar "Confirm email" desligado.
- Entrar no PC primeiro e conferir em Table Editor → profiles se aparece o usuário com cargo `dono`.
- Com isso, **faturas, gastos, saldos, metas e o progresso das aulas** já passam a ficar salvos na conta e aparecem no PC e no celular (é tudo `data` do perfil, sincronizado a cada ~45 s em `core/cloud.ts`). Se depois disso algo não sincronizar, investigar o caso específico.

## 1. IA rápida (prioridade)
Causa provável dos 3 minutos: o modo automático escolhe os modelos maiores (DeepSeek, Kimi, GLM), que na conta grátis da NVIDIA ficam em fila, e cada tentativa espera até 40 s antes de trocar (`core/ai.ts`, `FIRST_BYTE_MS`), até 4 modelos.
- Ranking com peso em velocidade: preferir modelos médios e rápidos para conversa (ex.: Llama 3.3/4 médio, Mistral Small, Nemotron Nano/Super, Qwen médio) e deixar os gigantes só para relatórios.
- Disparar 2 modelos ao mesmo tempo e ficar com o primeiro que começar a responder; tempo de espera inicial de ~10 s.
- Medir o tempo até a primeira palavra de cada modelo e guardar a média para escolher os mais rápidos.
- Diminuir o contexto enviado (só as seções que o modo usa, menos histórico) e limitar a resposta.
- Mostrar na tela "pensando…" com o tempo, e um botão "tentar outro modelo".

## 2. Gastos: o que sobra de verdade (prioridade)
Hoje o "Saldo" do topo é renda + extras − gastos lançados, e não desconta as faturas.
- Novo cálculo: **Disponível para gastar = renda + extras − gastos no débito/Pix/dinheiro − faturas em aberto do mês − gastos planejados do mês**.
- Evitar contar duas vezes: compras no crédito de um banco que tem fatura informada entram pela fatura, não somam de novo.
- Cartões do topo: Renda · Comprometido (gastos + faturas) · Disponível para gastar · Disponível por dia até o fim do mês.
- Barra do mês: quanto da renda já está comprometido, com aviso quando passar de 80% e 100%.
- Mesmo cálculo na Início, no "Vale a pena?" e no contexto da IA.

## 3. Ajustes visuais rápidos
- Filtros (select "Maior variação" etc.): as opções ficam escuras sobre fundo escuro. Definir `color-scheme: dark` e cor de fundo/texto das `<option>` no tema escuro (`src/index.css`).
- Celular e tablet: logo maior no topo e no login, revisar telas cortadas (tabelas e cartões com largura fixa, cabeçalhos com muitos botões) em 360, 390, 768 e 1024 px. Capturar prints de cada tela nessas larguras no e2e.

## 4. Início sem investimentos
- Patrimônio = saldo nas contas + investimentos. Sem investimentos, mostrar o saldo das contas, o disponível do mês e um convite para as aulas e para o plano de investimento.
- O gráfico de evolução começa a partir do primeiro investimento (ou do saldo das contas, guardando um ponto por dia).

## 5. Assistente: memória e mensagens
- Memória da conta: o Assistente salva fatos que a pessoa contar (hobbies, gostos, metas, "gosto de jogar e de comer fora"). Guardar em `data.memory` (sincroniza pela nuvem). A IA propõe "Salvar na memória?" e a pessoa confirma.
- Configurações → Memória do Assistente: ver, editar e apagar cada item, ou apagar tudo.
- Análise de compra completa (modo "Vale a pena comprar?"): usar memória + saldo das contas + faturas + parcelas futuras + gastos planejados + metas, e responder com: cabe ou não, impacto nos próximos meses, se parece impulsiva (pergunta: "quer isso há quanto tempo?", espera de 7 dias para itens caros) e a melhor forma de pagar.
- Apagar mensagem: botão em cada mensagem (só a própria conversa), e "limpar conversa" por modo.

## 6. Gastos planejados com plano da IA
- Nova seção "Gastos que vão vir": descrição, valor, data (ex.: projeto da faculdade, viagem, presente), recorrente ou não.
- Botão "Montar plano": a IA cria um plano com datas (quanto guardar por semana/mês, quando comprar, o que cortar) e salva como checklist que a pessoa marca.
- Baixar o plano em PDF (reaproveita `core/reports.ts`).
- Esses gastos entram no "Disponível para gastar" e nos alertas.

## 7. Plano de investimento e de riqueza
- Questionário curto (objetivo, prazo, perfil, quanto consegue guardar, mesmo R$ 1).
- Plano gerado com valores reais de hoje (CDI, Tesouro, poupança): por onde começar com centavos/R$ 1 (Tesouro Selic, CDB com liquidez diária, caixinhas), quando montar a reserva, quando diversificar.
- Plano de longo prazo com datas e marcos ("R$ 1.000 em março", "reserva completa em…"), projeção com juros compostos, e PDF.
- Base de conteúdo (sempre disponível, sem internet): resumos de princípios de livros conhecidos (Pai Rico Pai Pobre, O Homem Mais Rico da Babilônia, Os Segredos da Mente Milionária, Me Poupe!, Do Mil ao Milhão, A Psicologia Financeira) guardados no app e enviados à IA junto com a pergunta.
- Pesquisa na internet (a IA da NVIDIA não pesquisa sozinha): o app faz a busca e entrega os resultados à IA. Opções gratuitas, em ordem:
  1. **Tavily** (1.000 buscas/mês grátis, feita para IA, devolve o texto já resumido) ou **Brave Search API** (plano grátis com cota mensal). O Dono cola a chave em Configurações, igual à da NVIDIA, e ela vale para todas as contas pela nuvem.
  2. **Jina Reader** (`r.jina.ai/<link>`, grátis e sem chave) para ler o conteúdo de uma página encontrada.
  3. **Wikipedia** (API aberta, sem chave) como fonte extra para conceitos.
  - O Assistente ganha um interruptor "Pesquisar na internet" e mostra as fontes usadas no fim da resposta e no PDF.
- Lembretes mensais para cumprir o plano.

## 8. Gravar voz
- Botão de microfone no Assistente: grava o áudio e transcreve.
- O reconhecimento de voz do navegador não funciona no Electron nem no WebView do Android. Opção gratuita: modelo de fala da própria NVIDIA (Whisper/Parakeet no build.nvidia.com) com a mesma chave; no Android, alternativa é o plugin nativo de reconhecimento de voz do Capacitor.

## 9. "Vale a pena?" em mais lojas
- Mercado Livre bloqueia a leitura da página. Usar a API pública deles (`api.mercadolibre.com`) pelo código do anúncio (MLB...), e fallback pelo `og:`/JSON-LD com cabeçalhos de navegador via rede do Chromium.
- Amazon, Shopee e AliExpress: testar cada uma; quando bloquear, pedir o preço e manter os links de histórico.
- Não existe acesso livre "a todos os sites do Google" de graça; a busca por nome pode usar a API do Mercado Livre e da Steam.

## 10. Contas fixas com lembrete
- Cadastro de contas que se repetem (aluguel, internet, luz, streaming, academia): valor, dia do vencimento, banco.
- Aviso 3 dias antes e no dia (notificação no PC e no celular), botão "Paguei" que lança o gasto do mês.
- Entram no "Disponível para gastar" antes mesmo de serem pagas.

## 11. Modo privacidade
- Botão de olho no topo (e atalho) que troca todos os valores por "R$ •••••". Fica salvo por aparelho.

## 12. Caixinhas automáticas
- Caixinhas com nome, meta e valor mensal (ex.: "Viagem" R$ 100/mês no dia 5). No dia, o app lança o valor guardado, desconta do disponível e mostra o progresso.
- Podem ser ligadas às metas e ao plano de investimento.

## 13. Resumo semanal no domingo
- Todo domingo: quanto gastou na semana, comparação com a semana anterior, quanto sobra no mês, contas que vencem na semana e uma dica do Assistente. Notificação + card na Início, e opção de desligar em Configurações.

## 14. Limpeza do histórico do GitHub (por último)
- Um commit único com a conta do Bruno como autor, sem menção ao Claude; trocar a `main`; tirar `claude/**` do `media.yml`; apagar as branches antigas.

## Outras ideias
- Exportar/importar backup em arquivo, além da nuvem.
