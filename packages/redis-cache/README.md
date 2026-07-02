# @directus-test/redis-cache

Valida o comportamento de cache do Directus com Redis, contra uma instância
real subida via Docker (SQLite em tmpfs, Redis sem persistência) — sem
mocks.

## Cenários cobertos

Todos os cenários abaixo, além de checar o header
`X-Directus-Cache-Status`, provam numericamente onde a requisição passou —
quantas queries SQL bateram na tabela de teste (`contarQueriesParaTabela`)
e quantas chamadas Redis `GET`/`SET` aconteceram (`obterEstatisticasRedis` /
`diferencaDeChamadas`), em vez de confiar só no header. O compose deste
pacote roda com `LOG_LEVEL=trace` para viabilizar essa contagem de queries.

1. **hit-miss-mesmo-usuario** — mesma consulta do mesmo usuário: 1ª chamada
   `MISS` (consulta o banco, grava no Redis), 2ª `HIT` (só lê do Redis, 0
   queries); mudar o filtro volta a dar `MISS` e consulta o banco de novo.
2. **isolamento-por-usuario** — dois usuários com permissão de linha
   diferente fazendo a mesma URL/filtros: cada `MISS` bate no banco de
   verdade (prova que o `MISS` de B não reaproveitou a chave de cache de
   A), cada `HIT` não toca o banco, e sem vazamento de dado entre caches.
3. **auto-purge** — com `CACHE_AUTO_PURGE=true`, o `HIT` não consulta o
   banco; criar um item novo na coleção invalida o cache e a consulta
   seguinte volta a bater no banco de verdade (não só limpa o header).
4. **ttl** — o TTL da chave gravada no Redis (inspecionado via `ioredis`)
   condiz com `CACHE_TTL` configurado no Directus.
5. **observabilidade** — o cenário mais direto de todos, dedicado só a essa
   prova numérica: MISS consulta o banco e grava no Redis; o HIT seguinte
   só lê do Redis, sem tocar o banco.

## Rodar

```bash
pnpm turbo run test:integration --filter=@directus-test/redis-cache
```
