# Hoje é dia de...

Extensão de navegador que avisa, ao abrir o navegador, quais datas comemorativas — nacionais, mundiais e curiosidades — correspondem ao dia atual.

Ao iniciar o navegador, uma notificação do sistema mostra as datas do dia. Clicando nela (ou no ícone da extensão), abre-se uma página com os detalhes.

> **Por que notificação e não um popup?** Chrome, Firefox e Opera bloqueiam de propósito a abertura automática do popup de uma extensão sem gesto do usuário — é uma proteção anti-spam da plataforma. A notificação do sistema é o mecanismo que permite avisar sozinho, sem depender de clique.

## Stack

- TypeScript
- Vite + [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin) para o empacotamento MV3
- Dataset local em JSON — sem backend, sem chamadas de rede em runtime, funciona offline
- [`web-ext`](https://github.com/mozilla/web-ext) para validar compatibilidade com o Firefox

## Compatibilidade

Um único build em `dist/` atende os três navegadores. O manifest declara `background.service_worker` (lido por Chrome e Opera) e `background.scripts` (lido pelo Firefox) apontando para o mesmo arquivo; cada navegador ignora a chave que não reconhece.

## Build

```bash
npm install
npm run build
```

## Instalação

**Chrome** — `chrome://extensions` → ative o "Modo do desenvolvedor" → "Carregar sem compactação" → selecione `dist/`

**Opera** — `opera://extensions` → ative o "Modo do desenvolvedor" → "Carregar sem compactação" → selecione `dist/`

**Firefox** — `about:debugging#/runtime/this-firefox` → "Carregar extensão temporária" → selecione `dist/manifest.json`
(Requer Firefox 140+. A instalação temporária é removida ao fechar o navegador; instalação permanente exige assinatura pela Mozilla.)

## Os dados

O dataset cobre os 366 dias do ano e é **gerado a partir dos artigos "dia do ano" da Wikipédia em português** (`1 de janeiro`, `2 de janeiro`, …). Cada artigo traz uma seção "Feriados e eventos cíclicos", subdividida em *Internacional*, *Brasil* e *Cristianismo*, além de "Eventos históricos".

O mapeamento é direto: *Internacional* → `mundial`, *Brasil* → `nacional`, efemérides → `curiosidade`. Aniversários de município são filtrados fora, por serem ruído para o propósito da extensão. Dias com poucas entradas são completados com efemérides históricas, de modo que **todo dia do ano tem ao menos uma entrada**.

`src/data/sources.json` guarda o link do artigo de origem de cada dia, para que qualquer entrada possa ser rastreada até a fonte.

### Regenerando e conferindo

```bash
npm run dates:fetch    # regenera dates.json e sources.json a partir da Wikipédia
npm run dates:verify   # confere uma amostra contra os artigos de origem
```

A verificação baixa o **HTML renderizado** dos artigos (não o wikitexto) e checa se cada título do dataset aparece no verbete — assim a checagem não depende do mesmo parser que gerou os dados. A última execução conferiu 539 entradas em 120 dias, sem divergências.

> **Limite dessa verificação:** ela prova que o dataset é fiel à Wikipédia, não que a Wikipédia esteja correta. Datas comemorativas brasileiras de nicho raramente têm fonte primária acessível; correções são bem-vindas via issue ou PR.

## Desenvolvimento

```bash
npm run dev           # build com hot reload
npm run lint:firefox  # valida o dist/ com as regras da Mozilla
```

Para inspecionar a página de detalhe com uma data específica, sem mexer no relógio do sistema, adicione a query string `?data=MM-DD`:

```
chrome-extension://<id>/src/details/index.html?data=12-25
```

## Estrutura

```
src/
  background/main.ts   # dispara a notificação no início do navegador
  details/             # página de detalhe (HTML, CSS, TS)
  data/
    dates.json         # dataset, chaveado por "MM-DD"
    sources.json       # artigo de origem de cada dia
  types.ts
scripts/
  fetch-dates.mjs      # gera o dataset a partir da Wikipédia
  verify-dates.mjs     # confere uma amostra contra a fonte
  generate-icons.mjs   # gera os PNGs dos ícones
  patch-firefox-fields.mjs
manifest.config.ts
```

## Licenças

O **código** está sob licença MIT.

O **dataset** (`src/data/dates.json`) deriva da Wikipédia em português e é distribuído sob [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br), a mesma licença do conteúdo original — ver `src/data/LICENSE`. Atribuição: colaboradores da Wikipédia em português, artigos "dia do ano".

## Backlog

- Publicar na Chrome Web Store, Opera Add-ons e AMO (Firefox)
- Dividir o dataset por mês e carregar sob demanda (hoje o service worker importa os 366 dias para exibir um)
- Favoritar/fixar datas e ver histórico de dias visitados
- Busca por outras datas além da atual
