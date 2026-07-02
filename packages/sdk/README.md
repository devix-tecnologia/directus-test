# @directus-test/sdk

Utilitários compartilhados por todos os pacotes da suíte `directus-test`.
Não sobe nenhum container sozinho — cada pacote de teste traz seu próprio
`docker-compose.yml` e usa este SDK para orquestrá-lo, autenticar e criar
dados de teste.

## O que exporta

- **`docker`** — `subirAmbienteDirectus()`: sobe um `docker-compose.yml`
  qualquer via [testcontainers](https://node.testcontainers.org/), espera o
  healthcheck do Directus e devolve a URL base + função de teardown.
- **`http`** — `directusFetch()`: wrapper fino sobre `fetch` nativo que
  expõe status, headers (ex.: `X-Directus-Cache-Status`) e corpo da
  resposta — útil quando o `@directus/sdk` oficial esconde os headers.
- **`bootstrap`** — `autenticarAdmin()` e `criarUsuarioComPermissao()`: login
  administrativo e criação de role + policy (com filtro de permissão de
  linha) + usuário, para testes que precisam de múltiplos usuários com
  acessos diferentes.
- **`e2e`** — `loginAdminApp()`: helper Playwright para testes E2E futuros
  que precisam fazer login na interface administrativa do Directus.
  `playwright` é `peerDependency` opcional — só é necessário para quem usa
  este helper.
- **`observability`** — visibilidade sobre onde uma requisição realmente
  "passou":
  - `obterEstatisticasRedis()` / `diferencaDeChamadas()`: lê `INFO
    commandstats` do Redis e permite tirar um snapshot antes/depois para
    saber quantos `GET`/`SET`/etc. um teste efetivamente disparou.
  - `obterLogsDesde()` / `contarQueriesSql()`: lê os logs do container do
    Directus desde um instante (via `docker logs --since`) e conta quantas
    linhas correspondem a queries SQL — o Directus loga cada query com sua
    duração quando `LOG_LEVEL=trace` (ver `database/index.ts` do próprio
    Directus). Não depende de OpenTelemetry: o Directus só instrumenta OTEL
    para chamadas de IA (Langfuse/Braintrust), não para requisições HTTP,
    cache ou banco.

## Uso típico

```ts
import { subirAmbienteDirectus, autenticarAdmin } from "@directus-test/sdk";

const ambiente = await subirAmbienteDirectus({
  composeFilePath: import.meta.dirname,
  env: { CACHE_TTL: "30s" },
});

const token = await autenticarAdmin(ambiente.baseUrl, {
  email: "admin@example.com",
  senha: "admin-password",
});

await ambiente.parar();
```
