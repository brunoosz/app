<p align="center">
  <img src="build/icon.png" width="88" alt="Ícone do Investa">
</p>

<h1 align="center">Investa</h1>

<p align="center">
  Aplicativo para Windows que ensina a investir do zero.<br>
  Aulas de poucos minutos, cotações do dia, controle de gastos e um professor de IA que responde com base na sua carteira.
</p>

<p align="center">
  <a href="https://github.com/brunoosz/app/releases/latest"><img src="https://img.shields.io/badge/Baixar_para_Windows-4F8CFF?style=for-the-badge&logo=windows&logoColor=white" alt="Baixar para Windows" height="34"></a>
</p>

<p align="center">
  <a href="https://github.com/brunoosz/app/releases/latest"><img src="https://img.shields.io/github/v/release/brunoosz/app?label=vers%C3%A3o&color=4F8CFF" alt="Última versão"></a>
  <a href="https://github.com/brunoosz/app/actions/workflows/build.yml"><img src="https://github.com/brunoosz/app/actions/workflows/build.yml/badge.svg" alt="Build"></a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/media/capa-escuro.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/media/capa-claro.png">
  <img src="docs/media/capa-escuro.png" alt="Tela inicial do Investa com patrimônio, divisão da carteira, trilha de aulas, objetivos e indicadores do dia">
</picture>

Você informa quanto ganha e quanto gasta e cadastra o que já tem investido. Com isso, o app mostra quanto a carteira rende, quanto falta para cada meta e qual é a próxima aula. As cotações vêm do Yahoo Finance, os títulos públicos, do Tesouro Direto, e os juros e a inflação, do Banco Central. Contas e dados ficam no seu computador. Só as perguntas ao Professor IA saem dele, junto com os dados que a IA usa para responder.

O conteúdo é educativo e não é recomendação de investimento.

## Mercado

A tela Mercado tem 11 categorias: ações brasileiras e americanas, FIIs, ETFs, BDRs, Tesouro Direto, renda fixa bancária, cripto, moedas, índices e commodities. Cada ativo com cotação tem gráfico de linha ou de candles, de 1 dia até o histórico completo, com médias de 50 e 200 dias e, quando o Yahoo Finance informa, P/L e dividend yield.

<img src="docs/media/mercado.gif" alt="Abrindo o Mercado, filtrando as ações por PETR, abrindo a PETR4, trocando o período do gráfico e mudando para candles" width="100%">

## Aulas

São 30 aulas em 10 módulos, de "o que é investir" até montar uma carteira, imposto de renda e como se proteger de golpes. Cada aula termina com um quiz de três perguntas. As respostas certas valem XP, e é preciso acertar as três para liberar a próxima aula.

<p align="center">
  <img src="docs/media/aula.gif" alt="Respondendo ao quiz de uma aula, ganhando XP e subindo de nível" width="82%">
</p>

## Gastos e metas

Lance os gastos do mês por categoria e cartão, inclusive compras parceladas, e exporte o mês em PDF ou Excel. Cada meta tem valor e prazo. Com o CDI e o IPCA de hoje, o app projeta quanto você terá no fim do prazo e, se não for suficiente, quanto precisa aplicar por mês. Para a parte aplicada em CDB, LCI ou LCA, também mostra quanto você teria em outros bancos.

<img src="docs/media/gastos.gif" alt="Lançando um notebook de R$ 4.200 em 10 vezes no cartão" width="100%">

## Mais telas

<table>
  <tr>
    <td width="50%"><img src="docs/media/carteira.png" alt="Carteira"><br><sub>Carteira dividida por classe de ativo e por banco</sub></td>
    <td width="50%"><img src="docs/media/objetivo-projecao.png" alt="Projeção de uma meta"><br><sub>Projeção de uma meta e comparação entre bancos</sub></td>
  </tr>
  <tr>
    <td><img src="docs/media/ativo.png" alt="Página da PETR4"><br><sub>Página de um ativo, com indicadores explicados</sub></td>
    <td><img src="docs/media/bancos.png" alt="Ranking de bancos"><br><sub>Ranking de bancos com o motivo de cada nota</sub></td>
  </tr>
  <tr>
    <td><img src="docs/media/alertas.png" alt="Alertas"><br><sub>Avisos automáticos sobre os ativos da carteira</sub></td>
    <td><img src="docs/media/simulador.png" alt="Simulador"><br><sub>Simulador com R$ 100 mil virtuais</sub></td>
  </tr>
</table>

<sub>As imagens usam uma conta de demonstração, com cotações, juros e indicadores reais do dia da captura.</sub>

## Download

A versão mais recente está em [Releases](https://github.com/brunoosz/app/releases/latest).

| Arquivo | Uso |
|---|---|
| `Investa-Setup-<versão>.exe` | Instalador. Deixa escolher a pasta e cria atalhos na área de trabalho e no menu Iniciar. |
| `Investa-Portatil-<versão>.exe` | Executável único que roda sem instalar. |

O executável não tem assinatura digital, então o Windows pode mostrar "O Windows protegeu o computador". Para abrir, clique em "Mais informações" e depois em "Executar assim mesmo".

Só o Windows tem builds prontos. O `.dmg` e o `AppImage` podem ser gerados a partir do código (veja [Gerar instaladores](#gerar-instaladores)).

## Primeiro uso

1. Crie uma conta. A primeira conta criada recebe o cargo Dono, e as seguintes, feitas pela tela de cadastro, entram como Usuário. O Dono pode criar Administradores e outros Donos na tela Usuários.
2. Responda ao questionário: renda, gastos, quanto dá para investir, perfil de investidor e objetivo principal. Os dados financeiros podem ser alterados depois em Configurações.
3. Para usar o Professor IA, crie uma chave em [build.nvidia.com](https://build.nvidia.com/settings/api-keys), cole a chave (`nvapi-...`) em Configurações → Inteligência Artificial e clique em "Testar conexão". Só Dono e Administrador veem essa seção, e a chave salva vale para todas as contas do app.

Todo mundo entra pela mesma tela, só com usuário e senha. O cargo vem da conta e define o que aparece dentro do app: a tela Usuários, por exemplo, só existe para Dono e Administrador. Com "Manter conectado" ligado (é o padrão), a sessão fica salva por 30 dias e o login é pulado.

O Administrador gerencia só contas de Usuário, só o Dono muda cargos, e o app não deixa remover, rebaixar nem bloquear o último Dono.

## Todas as telas

| Tela | O que faz |
|---|---|
| Início | Gráfico do patrimônio, divisão da carteira, objetivos, indicadores do dia (Selic, CDI, IPCA 12m, dólar, Ibovespa), favoritos e notícias |
| Carteira | Renda variável (símbolo, quantidade, preço médio) e renda fixa (CDB, LCI, LCA, Tesouro, poupança, debênture) indexada a CDI, Selic, IPCA ou prefixada |
| Mercado | 11 categorias: 267 ativos com cotação em 9 delas, mais os títulos do Tesouro Direto e a renda fixa bancária. Tem busca no Yahoo Finance e favoritos. Cada ativo tem gráfico de linha ou candles de 1D a MAX, P/L, P/VP, dividend yield e médias de 50 e 200 dias |
| Aulas | 30 aulas em 10 módulos, do iniciante ao avançado, com quiz, XP, níveis, conquistas, ranking e um glossário de 45 termos |
| Professor IA | Chat que responde usando os indicadores do dia, cotações, notícias, títulos do Tesouro e os dados do usuário (perfil, carteira, objetivos e gastos) |
| Objetivos | Metas com valor e prazo, projeção com CDI e IPCA atuais e, para a parte aplicada em CDB, LCI ou LCA, comparação entre bancos |
| Gastos | Lançamentos por categoria, forma de pagamento e banco, com parcelamento. Exporta o mês em PDF ou Excel |
| Bancos | Ranking de 14 bancos e corretoras com o motivo de cada nota, rendimento com o CDI do dia (líquido de IR) e juros de crédito informados pelo Banco Central |
| Simulador | R$ 100.000 virtuais para comprar e vender ativos a preços reais |
| Alertas | Preço acima ou abaixo de um valor, variação no dia, queda abaixo da média de 50 dias e lembretes com data e hora. Também ajusta os limites dos avisos automáticos da carteira |
| Usuários | Criar, editar, bloquear e excluir contas e redefinir senhas (só Dono e Administrador) |

As aulas são liberadas em sequência. A próxima só abre com pelo menos 70% no quiz. Como cada quiz tem 3 perguntas, na prática é preciso acertar todas.

### Avisos automáticos

Além dos alertas criados pelo usuário, o app avisa quando:

- um ativo de renda variável da carteira passa de 10% de lucro ou de prejuízo sobre o preço médio, ou fica 5% acima ou abaixo da média de 50 dias (os limites podem ser mudados na tela Alertas);
- há reunião ou decisão do Copom, ou divulgação do IPCA;
- o Ibovespa varia 1,5% ou mais no dia (a partir das 15h, horário de Brasília) ou o dólar varia 1% ou mais.

Também mostra uma dica de educação financeira por dia.

Os alertas rodam só para a conta conectada e enquanto o app está aberto. Com a opção "Continuar em segundo plano" ligada (vem desligada), fechar a janela deixa o app na bandeja e os alertas continuam rodando. Com a janela fora de foco, os avisos aparecem como notificação do Windows, se essa opção estiver ligada (vem ligada).

## Fontes de dados

| Dado | Fonte | Cache |
|---|---|---|
| Cotações | Yahoo Finance | 10 s |
| Gráficos | Yahoo Finance | de 30 s (1D) a 12 h (MAX), conforme o período |
| Selic, CDI, IPCA, PTAX, poupança, TR | Banco Central (SGS) | 30 min |
| Expectativas do Boletim Focus | Banco Central (API Olinda) | 6 h |
| Juros de crédito por banco | Banco Central (API Olinda, `taxaJuros`) | 12 h |
| Títulos públicos | JSON do Tesouro Direto, com o CSV do Tesouro Transparente como alternativa | 1 h em memória, 4 h em disco |
| Notícias | RSS de InfoMoney, Money Times, g1 Economia, Exame e CNN Brasil | 10 min |

Com a janela visível, a tela atualiza as cotações a cada 15 segundos. Segundo o Yahoo Finance, as cotações da B3 têm até 15 minutos de atraso, e as de cripto e câmbio são praticamente em tempo real.

## Configuração da IA

Por padrão, o Professor IA usa `https://integrate.api.nvidia.com/v1` com o modelo `meta/llama-4-maverick-17b-128e-instruct`. A NVIDIA aposenta modelos de tempos em tempos. Quando o modelo configurado deixa de existir, o app escolhe sozinho outro disponível na sua conta e passa a usá-lo.

O app procura a chave nesta ordem:

1. a chave salva em Configurações;
2. um arquivo de configuração;
3. a variável de ambiente `NVIDIA_API_KEY`.

Para usar um arquivo, copie `config.example.json` para `config.json` e preencha a chave:

```json
{
  "nvidiaApiKey": "nvapi-...",
  "model": "meta/llama-4-maverick-17b-128e-instruct"
}
```

Em cada pasta da lista abaixo, o app procura `config.json`, `investa.config.json` e `.env` (com a linha `NVIDIA_API_KEY=...`), nessa ordem. Vale o primeiro arquivo válido: JSON com erro e `.env` sem essa linha são ignorados.

1. pasta de dados do app;
2. pasta onde está o `.exe` portátil;
3. pasta do executável;
4. só no modo `--dev`, a pasta de onde o app foi iniciado (a raiz do projeto, com `npm run electron:dev`).

O arquivo também aceita os campos `apiKey` e `baseUrl`. Do `.env`, o app lê só a chave. O modelo escolhido em Configurações tem prioridade sobre o do arquivo. A tela não tem campo para a URL, então outra API compatível com a da OpenAI (com `/chat/completions` em streaming) só pode ser usada pelo campo `baseUrl` do arquivo. Todos esses nomes de arquivo estão no `.gitignore`.

## Dados locais

Os dados ficam na pasta `userData` do Electron. No Windows, o caminho é `%APPDATA%\Investa`, e a tela Configurações → Sobre mostra a pasta em uso.

- `investa-data.json` guarda as contas, os dados de cada usuário, as notificações, as configurações, a sessão salva e a chave da IA. As senhas são salvas com scrypt e um salt próprio para cada usuário. O app grava primeiro em um `.tmp` e depois renomeia, para o arquivo não ficar pela metade se o app fechar no meio da gravação.
- `investa-data.bak.json` é uma cópia feita sempre que o app abre. Se o arquivo principal estiver corrompido, ele é renomeado para `investa-data.corrompido-<timestamp>.json` e o app tenta recuperar os dados dessa cópia.
- `cache-tesouro.json` guarda a última consulta ao Tesouro e é usado quando a busca falha.

Para usar outra pasta, defina a variável `INVESTA_USER_DATA`. Para fazer backup, copie `investa-data.json` com o app fechado.

## Desenvolvimento

Você precisa do Node.js 22 (a versão usada no CI) e do npm.

```bash
git clone https://github.com/brunoosz/app.git investa
cd investa
npm install
npm run electron:dev
```

O `electron:dev` compila o processo principal uma vez e abre o Vite (porta 5173) junto com o Electron. Mudanças em `src/` aparecem na hora. Mudanças em `electron/`, e em `shared/` quando afetam o processo principal, só valem depois de reiniciar o comando. No modo de desenvolvimento, o F12 abre as DevTools.

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe só a interface no Vite. Sem o Electron, nenhuma chamada ao processo principal funciona, nem o login |
| `npm run typecheck` | Verifica os tipos da interface e do processo principal |
| `npm run build` | Roda o typecheck e gera a interface em `dist/` e o processo principal em `dist-electron/` |
| `npm run electron:start` | Faz o build e abre o app compilado |
| `npm run icons` | Gera os ícones de novo a partir de `shared/brand.ts` |
| `npm run media` | Gera os prints e GIFs deste README em `docs/media` |

O script de ícones precisa do Chromium (caminho definido em `CHROMIUM_PATH`) e do comando `convert` do ImageMagick. Os ícones gerados já estão no repositório, então só rode esse script se for mudar a marca.

O `npm run media` faz o build, abre o app com uma conta de demonstração e precisa de internet e do `ffmpeg`. Se o `gifsicle` e o `pngquant` estiverem instalados, os arquivos saem menores. Com a `NVIDIA_API_KEY` definida, ele também grava um GIF do Professor IA. No Linux sem interface gráfica, rode como no CI: `npm run build && xvfb-run -a -s "-screen 0 3200x2000x24" node scripts/capture.mjs`.

### Testes

O projeto não tem testes unitários. A verificação é feita por dois scripts.

`npm run smoke:data` testa Yahoo Finance, Banco Central, Tesouro, RSS e o ranking de bancos. O comando só termina com erro se falharem as cotações, o gráfico de PETR4, o gráfico do Ibovespa ou os indicadores do Banco Central.

O teste e2e não tem script npm. Ele usa Playwright para abrir o app compilado com uma pasta de dados temporária. O roteiro cria uma conta, responde ao questionário, cadastra PETR4 e um CDB, passa por todas as telas e salva prints em `e2e-shots/` (ou na pasta definida em `SHOTS`). O teste falha se a página lançar uma exceção ou se algum passo não encontrar o elemento esperado. Erros no console só aparecem no log.

```bash
npm run build
node scripts/e2e.mjs

# Linux sem interface gráfica, como no CI:
xvfb-run -a -s "-screen 0 1440x900x24" node scripts/e2e.mjs
```

### Gerar instaladores

```bash
npm run electron:build:win     # instalador NSIS e versão portátil
npm run electron:build:mac     # .dmg (só funciona em um Mac)
npm run electron:build:linux   # AppImage
```

Os arquivos vão para `release/`. Builds locais saem com a versão `1.0.0` do `package.json`, porque a numeração das releases só é aplicada no CI.

### CI e releases

O workflow [`build.yml`](.github/workflows/build.yml) roda em todo push para `main`, `master` e `claude/**`, em tags `v*` e também quando acionado manualmente. Pushes que mudam só o README, `docs/` ou o script de captura não disparam esse workflow. Ele tem dois jobs, que rodam em paralelo:

- Linux: faz o build, roda o smoke test (uma falha aqui não interrompe o job) e o teste e2e. Os prints ficam salvos no artefato `prints-das-telas`.
- Windows: gera os dois `.exe` com a versão `1.0.<número da execução>` e publica a release `v1.0.<n>` como a mais recente.

Por causa dessa numeração, enviar uma tag `v*` também gera uma release `v1.0.<n>`, e não uma com o nome da tag. Como o job do Windows não espera o de testes, a release sai mesmo se o teste e2e falhar.

O workflow [`media.yml`](.github/workflows/media.yml) gera as imagens deste README. Ele roda quando `scripts/capture.mjs` ou o próprio `media.yml` mudam em um branch `claude/**`, ou quando acionado manualmente, e faz commit do resultado em `docs/media`. Se o repositório tiver o secret `NVIDIA_API_KEY`, o GIF do Professor IA também é gravado.

## Estrutura

```
electron/          processo principal: janela, IPC, bandeja e notificações
  preload.ts       ponte entre a interface e o processo principal
  services/        contas, armazenamento, fontes de dados, IA, alertas e relatórios
  smoke.ts         teste das fontes de dados
src/               interface em React: telas, componentes e estado (Zustand)
shared/            código usado pelos dois lados: tipos, catálogo de ativos, aulas, glossário e bancos
scripts/           build do processo principal, teste e2e, ícones e imagens do README
build/             ícones usados pelo electron-builder
resources/         ícone empacotado junto com o app
docs/media/        prints e GIFs do README, gerados por scripts/capture.mjs
```

Stack: Electron 43, React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Zustand 5, React Router 6, lightweight-charts 5 e ExcelJS. O processo principal é empacotado com esbuild.

## Limitações

- O Yahoo Finance não tem API oficial. Se os endpoints mudarem, cotações e gráficos param de funcionar até o código ser ajustado.
- As taxas dos bancos (percentual do CDI) estão fixas em `shared/banks.ts` e precisam ser atualizadas à mão. Só o CDI usado no cálculo vem do Banco Central.
- O calendário do Copom está fixo em `electron/services/bcb.ts` e só cobre 2025 e 2026. As reuniões de 2027 precisam ser incluídas antes da virada do ano.
- Não há sincronização entre computadores. O ranking de XP só compara contas criadas na mesma máquina.
- A cada pergunta, o Professor IA envia ao provedor (a NVIDIA, por padrão) o nome do usuário, o perfil financeiro, a carteira, os objetivos, os gastos do mês, os alertas ativos, as notificações recentes, o progresso nas aulas e as últimas 12 mensagens da conversa.
- Se o sistema não oferecer o `safeStorage` do Electron, a chave da IA fica salva apenas em base64.
- O bloqueio de 30 segundos depois de 5 senhas erradas fica só na memória e é zerado quando o app reinicia.
