# Hoje é dia de...

Extensão de navegador que avisa, ao abrir o navegador, quais datas comemorativas — nacionais, mundiais e curiosidades — correspondem ao dia atual.

Ao iniciar o navegador, uma notificação do sistema mostra as datas do dia. Clicando nela (ou no ícone da extensão), abre-se uma página com os detalhes.

> **Por que notificação e não um popup?** Chrome, Firefox e Opera bloqueiam de propósito a abertura automática do popup de uma extensão sem gesto do usuário — é uma proteção anti-spam da plataforma. A notificação do sistema é o mecanismo que permite avisar sozinho, sem depender de clique.

## Stack

- TypeScript
- Vite + [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin) para o empacotamento MV3
- Dataset local em JSON (`src/data/dates.json`) — sem backend, sem chamadas de rede, funciona offline
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
  data/dates.json      # dataset de datas comemorativas (chave "MM-DD")
  types.ts
scripts/
  generate-icons.mjs        # gera os PNGs dos ícones
  patch-firefox-fields.mjs  # pós-build: campos específicos do Firefox
manifest.config.ts
```

## Expandindo o dataset

Cada entrada em `dates.json` segue o formato:

```json
{ "title": "Nome do dia", "type": "nacional | mundial | curiosidade", "description": "opcional" }
```

Dias sem entrada cadastrada mostram uma mensagem de fallback em vez de tela vazia — o dataset é pensado para crescer aos poucos.

## Estado da verificação

Verificado por automação no Opera GX: o service worker carrega sem erros, a notificação é criada tanto no `onInstalled` quanto no `onStartup` (navegador reaberto), e a página de detalhe renderiza corretamente. `web-ext lint` roda com zero erros.

Não verificado automaticamente: a renderização do balão nativo do Windows e o comportamento real no Firefox e no Chrome — vale um teste manual antes de publicar.

## Backlog

- Ampliar a cobertura do dataset (hoje ~31% dos dias do ano)
- Publicar na Chrome Web Store, Opera Add-ons e AMO (Firefox)
- Favoritar/fixar datas e ver histórico de dias visitados
- Busca por outras datas além da atual
