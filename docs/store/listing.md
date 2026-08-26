# Conteúdo da listagem na AMO

Texto para preencher a página da extensão em addons.mozilla.org. As capturas
estão nesta mesma pasta.

---

## Resumo (máx. 250 caracteres)

Ao abrir o navegador, receba uma notificação com as datas comemorativas do dia
— nacionais, mundiais e curiosidades históricas. Funciona offline, sem contas e
sem coletar nenhum dado.

## Descrição

**Toda vez que você abre o navegador, descubra o que se comemora hoje.**

Uma notificação discreta mostra as datas do dia. Clique nela para abrir a página
com todos os detalhes — ou clique no ícone da extensão quando quiser consultar.

**O que ela mostra**

- Datas comemorativas **nacionais** brasileiras
- Datas **mundiais** e internacionais
- **Curiosidades** e efemérides históricas

Todos os 366 dias do ano têm conteúdo, incluindo 29 de fevereiro.

**Como os dados são obtidos**

O conteúdo é extraído dos artigos "dia do ano" da Wikipédia em português e vem
embutido na extensão. Cada dia guarda o link do artigo de origem, então qualquer
informação pode ser conferida na fonte. O código que gera e que verifica o
dataset é aberto e pode ser reexecutado por qualquer pessoa.

**Privacidade**

A extensão não faz nenhuma requisição de rede durante o uso, não coleta dados,
não usa analytics e não pede permissão de acesso a sites. A única permissão
solicitada é a de exibir notificações.

**Código aberto**

https://github.com/Israel-Mendes-git/dose-diaria

---

## Categorias sugeridas

- Outros / Diversos (*Other*)
- Alertas e atualizações (*Alerts & Updates*)

## Tags

datas comemorativas, calendário, brasil, notificações, curiosidades

## Licença

Código: MIT.
Dataset: CC BY-SA 4.0, derivado da Wikipédia em português.

## Política de privacidade

A extensão não coleta, armazena nem transmite qualquer dado pessoal. Não realiza
requisições de rede em tempo de execução: todo o conteúdo exibido está embutido
no pacote. A permissão `notifications` é usada exclusivamente para exibir a
notificação diária local.

## Notas para a revisão

O pacote é gerado com Vite, então o código-fonte legível acompanha a submissão.
As instruções de compilação estão na seção "Build instructions (for AMO
reviewers)" do README, na raiz do arquivo de fontes.
