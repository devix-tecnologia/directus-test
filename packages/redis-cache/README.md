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

## Rodar

```bash
pnpm turbo run test:integration --filter=@directus-test/redis-cache
```
