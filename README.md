# Investa

**Aprenda · Invista · Evolua** — aplicativo de desktop (Windows, macOS e Linux) para aprender a investir do zero, acompanhar o mercado com dados reais e organizar a vida financeira.

## Baixar o .exe

Abra a página **Releases** deste repositório e baixe a versão mais recente:

- `Investa-Setup-x.y.z.exe` — instalador (recomendado)
- `Investa-Portatil-x.y.z.exe` — roda sem instalar

Cada envio de código gera um novo .exe automaticamente pelo GitHub Actions (aba **Actions**).

Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações → Executar assim mesmo** (o app ainda não tem certificado de assinatura digital).

## O que tem no app

- **Login com cargos** (Usuário, Administrador e Dono), criação de conta, senha com criptografia, "manter conectado". A primeira conta criada é a do Dono.
- **Usuários** (Dono/Admin): pesquisa por nome, filtro por cargo, editar, mudar senha, bloquear e excluir.
- **Questionário inicial**: salário, renda extra, gastos, dívidas, quanto pode investir, reserva e perfil de investidor (editável depois em Configurações).
- **Início**: gráfico do seu patrimônio, divisão da carteira, trilha de aulas, metas, indicadores e notícias.
- **Carteira**: ações, FIIs, ETFs, BDRs, cripto, CDB, LCI/LCA, Tesouro e poupança com cotações e taxas reais.
- **Mercado**: ações, FIIs, ETFs, BDRs, Tesouro Direto, renda fixa bancária, cripto, moedas, índices, commodities e ações dos EUA. Favoritos, ocultar/adicionar ativos, gráficos com linha/candles, volume e períodos de 1 dia a máximo.
- **Aulas**: trilha gamificada com 10 módulos e 30 aulas, quiz, XP, níveis, sequência de dias, conquistas, ranking e glossário.
- **Professor IA**: chat com IA de verdade (NVIDIA) que usa data/hora, indicadores do Banco Central, cotações, notícias e os seus dados financeiros.
- **Simulador**: R$ 100 mil virtuais comprando e vendendo a preços reais.
- **Objetivos**: metas com valor, prazo, onde e em qual banco você investe, projeção com Selic/CDI/IPCA do dia e comparação entre bancos.
- **Gastos**: lançamentos com parcelamento por banco/cartão, resumo do mês e exportação em **PDF** e **Excel**.
- **Bancos**: ranking diário com o porquê, comparador de rendimento e juros de crédito oficiais do Banco Central.
- **Alertas**: notificações do Copom, IPCA, dólar e Ibovespa; alertas de preço e lembretes personalizados; alertas inteligentes da carteira (abaixo/acima do normal, lucro e prejuízo), inclusive como notificação do Windows.
- **Configurações**: tema claro/escuro/sistema, senha, perfil, dados financeiros, notificações, chave da IA e sair da conta.

## Fontes de dados

| Dado | Fonte |
|---|---|
| Cotações (B3, cripto, câmbio, índices, commodities) | Yahoo Finance — B3 com atraso de até 15 min |
| Selic, CDI, IPCA, PTAX, poupança, TR | Banco Central do Brasil (SGS) |
| Expectativas do mercado | Boletim Focus (Banco Central) |
| Juros de crédito por banco | Banco Central (taxas de juros por instituição) |
| Títulos públicos | Tesouro Direto / Tesouro Transparente |
| Notícias | InfoMoney, Money Times, g1, Exame, CNN Brasil (RSS) |

## Inteligência artificial

Abra **Configurações → Inteligência Artificial** (conta Dono ou Administrador), cole a chave da NVIDIA (`nvapi-...`, gerada em build.nvidia.com) e clique em **Testar conexão**.

Alternativa: copie `config.example.json` para `config.json`, coloque sua chave e deixe o arquivo ao lado do .exe ou na pasta de dados do app (`%APPDATA%\Investa`). O arquivo `config.json` está no `.gitignore` para a chave nunca ir para o GitHub.

## Desenvolvimento

```bash
npm install
npm run electron:dev        # abre o app em modo desenvolvimento
npm run build               # typecheck + build
npm run electron:build:win  # gera o .exe em release/
npm run smoke:data          # testa as fontes de dados reais
```

Os dados de cada usuário ficam salvos localmente em `investa-data.json`, na pasta de dados do aplicativo.

> O Investa é uma ferramenta educacional. Nada no aplicativo é recomendação individual de investimento.
