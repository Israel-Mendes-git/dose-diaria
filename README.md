# Essa é sua dose diária 

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

## Instalação

Baixe o `.zip` mais recente em **[Releases](https://github.com/Israel-Mendes-git/dose-diaria/releases/latest)** e descompacte numa pasta que possa ficar onde está — o navegador carrega a extensão desse local, então apagar a pasta desinstala. Não é preciso ter Node nem compilar nada.

**Chrome** — `chrome://extensions` → ative o "Modo do desenvolvedor" → "Carregar sem compactação" → selecione a pasta descompactada

**Opera** — `opera://extensions` → ative o "Modo do desenvolvedor" → "Carregar sem compactação" → selecione a pasta descompactada

**Firefox** — `about:debugging#/runtime/this-firefox` → "Carregar extensão temporária" → selecione o `manifest.json` de dentro da pasta
(Requer Firefox 140+.)

> **Por que o "modo do desenvolvedor"?** Chrome e Opera só dispensam esse passo para extensões vindas da loja oficial, e o Firefox só mantém a instalação entre reinícios se o pacote for assinado pela Mozilla. Enquanto a extensão não estiver publicada, esse é o caminho — ver [backlog](#backlog).

## Build a partir do código

```bash
npm ci
npm run build   # gera dist/, que é o conteúdo do .zip do release
```

### Build instructions (for AMO reviewers)

This extension is bundled with [Vite](https://vite.dev/), so the shipped files are
generated. To reproduce them from source:

- **Operating system:** any; developed on Windows 11, verified on Ubuntu via GitHub Actions.
- **Node.js:** 24 (see `.nvmrc`) — download at <https://nodejs.org/>. npm ships with it.
- **No other tooling is required.** All dependencies are declared in `package.json`
  and pinned in `package-lock.json`.

```bash
npm ci          # installs the exact pinned dependency tree
npm run build   # type-checks, bundles with Vite, then patches Firefox-only manifest keys
```

The build writes the extension to `dist/`, which is exactly what is submitted.
`npm run build` runs three steps, defined in `package.json`:

1. `tsc --noEmit` — type-checking only, emits nothing.
2. `vite build` — bundles `src/` into `dist/` using `vite.config.ts` and `manifest.config.ts`.
3. `node scripts/patch-firefox-fields.mjs` — adds `background.scripts` and
   `browser_specific_settings.gecko_android` to the generated manifest, since the
   manifest helper used by the build does not emit those Firefox-specific keys.

No source file is minified beyond Vite's default production output, and the
extension makes no network requests at runtime — the dataset in `src/data/dates.json`
is bundled and read locally.

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

- Assinar o pacote na Mozilla (gratuito), para o Firefox manter a extensão entre reinícios
- Publicar na Chrome Web Store e no Opera Add-ons, dispensando o modo do desenvolvedor
- Dividir o dataset por mês e carregar sob demanda (hoje o service worker importa os 366 dias para exibir um)
- Favoritar/fixar datas e ver histórico de dias visitados
- Busca por outras datas além da atual
