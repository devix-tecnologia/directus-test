# directus-test

Suíte de testes automatizados para o Directus: cada pacote em `packages/`
valida um cenário específico (versão do Directus, banco de dados,
com/sem Redis, E2E via Admin App, etc.) contra instâncias reais rodando em
Docker.

## Estrutura

- `packages/sdk` — utilitários compartilhados por todos os pacotes de teste:
  orquestração de containers Docker (via `docker-compose.yml` de cada
  pacote), helpers HTTP para inspecionar respostas do Directus, bootstrap de
  usuários/permissões de teste, e helpers de E2E (login no Admin App).
- `packages/redis-cache` — valida o comportamento de cache do Directus com
  Redis: isolamento por usuário, hit/miss, auto-purge e TTL.

Novos pacotes de teste (outra versão do Directus, Postgres, sem Redis, E2E)
seguem o mesmo padrão: seu próprio `docker-compose.yml` + dependência de
`@directus-test/sdk`.

## Comandos

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test:integration   # roda todos os pacotes de teste (sobe/derruba Docker)
```

Para rodar um pacote específico:

```bash
pnpm turbo run test:integration --filter=@directus-test/redis-cache
```

## Engines de Docker não-Docker-Desktop (Colima, Rancher Desktop, OrbStack…)

O `@directus-test/sdk` detecta automaticamente o `DOCKER_HOST` a partir do
Docker context ativo (`docker context inspect`) e desabilita o container
"Ryuk" de limpeza automática (que falha em alguns desses engines) — não é
necessário exportar nada manualmente. O teardown de cada suíte já derruba
os containers explicitamente ao final (`global-setup.ts`), então
desabilitar o Ryuk é seguro.

Só é necessário ter o `docker` e o `docker-compose` (v2) disponíveis no
PATH — o `testcontainers` invoca `docker compose`/`docker-compose` por
baixo dos panos.
