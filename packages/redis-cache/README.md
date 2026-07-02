# @directus-test/redis-cache

Valida o comportamento de cache do Directus com Redis, contra uma instância
real subida via Docker (SQLite em tmpfs, Redis sem persistência) — sem
mocks.

## Cenários cobertos

1. **hit-miss-mesmo-usuario** — mesma consulta do mesmo usuário: 1ª chamada
   `MISS`, 2ª `HIT`; mudar o filtro volta a dar `MISS`.
2. **isolamento-por-usuario** — dois usuários com permissão de linha
   diferente fazendo a mesma URL/filtros: cada um tem seu próprio
   MISS→HIT, sem vazamento de dado entre caches.
3. **auto-purge** — com `CACHE_AUTO_PURGE=true`, criar um item novo na
   coleção invalida o cache da consulta.
4. **ttl** — o TTL da chave gravada no Redis (inspecionado via `ioredis`)
   condiz com `CACHE_TTL` configurado no Directus.
5. **observabilidade** — prova numericamente (não só pelo header
   `X-Directus-Cache-Status`) que um `MISS` de fato consulta o banco e
   grava no Redis (`SET` > 0, queries SQL > 0 nos logs do container), e que
   o `HIT` seguinte só lê do Redis (`GET` > 0, `SET` = 0, 0 queries SQL) —
   usando `@directus-test/sdk`'s `obterEstatisticasRedis`/`diferencaDeChamadas`
   e `obterLogsDesde`/`contarQueriesSql`. O compose deste pacote roda com
   `LOG_LEVEL=trace` para viabilizar essa contagem de queries.

## Rodar

```bash
pnpm turbo run test:integration --filter=@directus-test/redis-cache
```
