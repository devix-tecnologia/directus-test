import {
  aguardarLogs,
  contarQueriesParaTabela,
  diferencaDeChamadas,
  directusFetch,
  obterEstatisticasRedis,
  obterLogsDesde,
} from "@directus-test/sdk";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

const CACHE_STATUS_HEADER = "x-directus-cache-status";

describe("cache: mesmo usuário, mesma consulta", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const token = inject("tokenUsuarioA");
  const containerId = inject("directusContainerId");
  const redisHost = inject("redisHost");
  const redisPort = inject("redisPort");

  let redis: Redis;

  beforeAll(() => {
    redis = new Redis({ host: redisHost, port: redisPort });
  });

  afterAll(() => {
    redis.disconnect();
  });

  it("dá MISS na primeira chamada (consultando o banco) e HIT na segunda (só lendo do Redis), com o mesmo corpo", async () => {
    const caminho = `/items/${colecao}?filter[empresa][_eq]=empresa-a&sort=id`;

    const estatisticasAntesMiss = await obterEstatisticasRedis(redis);
    const inicioMiss = new Date();

    const primeira = await directusFetch(baseUrl, caminho, { token });
    expect(primeira.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    await aguardarLogs();
    expect(
      contarQueriesParaTabela(obterLogsDesde(containerId, inicioMiss), colecao),
    ).toBeGreaterThan(0);

    const estatisticasDepoisMiss = await obterEstatisticasRedis(redis);
    expect(
      diferencaDeChamadas(estatisticasAntesMiss, estatisticasDepoisMiss).set ?? 0,
    ).toBeGreaterThan(0);

    const estatisticasAntesHit = await obterEstatisticasRedis(redis);
    const inicioHit = new Date();

    const segunda = await directusFetch(baseUrl, caminho, { token });
    expect(segunda.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");
    expect(segunda.corpo).toEqual(primeira.corpo);

    await aguardarLogs();
    expect(contarQueriesParaTabela(obterLogsDesde(containerId, inicioHit), colecao)).toBe(0);

    const estatisticasDepoisHit = await obterEstatisticasRedis(redis);
    const chamadasNoHit = diferencaDeChamadas(estatisticasAntesHit, estatisticasDepoisHit);
    expect(chamadasNoHit.get ?? 0).toBeGreaterThan(0);
    expect(chamadasNoHit.set ?? 0).toBe(0);
  });

  it("mudar o filtro gera uma nova chave de cache (MISS) e consulta o banco de novo", async () => {
    const inicio = new Date();

    const resposta = await directusFetch(
      baseUrl,
      `/items/${colecao}?filter[empresa][_eq]=empresa-a&limit=1`,
      {
        token,
      },
    );

    expect(resposta.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    await aguardarLogs();
    expect(contarQueriesParaTabela(obterLogsDesde(containerId, inicio), colecao)).toBeGreaterThan(
      0,
    );
  });
});
