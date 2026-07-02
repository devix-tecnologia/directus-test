import {
  contarQueriesSql,
  diferencaDeChamadas,
  directusFetch,
  obterEstatisticasRedis,
  obterLogsDesde,
} from "@directus-test/sdk";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

const CACHE_STATUS_HEADER = "x-directus-cache-status";

describe("observabilidade: quantas vezes o cache toca o Redis e o banco", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const token = inject("tokenAdmin");
  const containerId = inject("directusContainerId");
  const redisHost = inject("redisHost");
  const redisPort = inject("redisPort");

  // Filtro exclusivo deste teste, para garantir um MISS real na 1ª chamada
  // independente da ordem de execução dos outros arquivos de teste.
  const caminho = `/items/${colecao}?filter[empresa][_eq]=empresa-a&sort=-id&limit=1&page=1`;

  let redis: Redis;

  beforeAll(() => {
    redis = new Redis({ host: redisHost, port: redisPort });
  });

  afterAll(() => {
    redis.disconnect();
  });

  it("MISS consulta o banco e grava no Redis; o HIT seguinte só lê do Redis, sem tocar o banco", async () => {
    const estatisticasAntesMiss = await obterEstatisticasRedis(redis);
    const inicioMiss = new Date();

    const respostaMiss = await directusFetch(baseUrl, caminho, { token });
    expect(respostaMiss.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    // dá um respiro para o log assíncrono do container ser escrito
    await new Promise((resolve) => setTimeout(resolve, 500));

    const queriesNoMiss = contarQueriesSql(obterLogsDesde(containerId, inicioMiss));
    expect(queriesNoMiss).toBeGreaterThan(0);

    const estatisticasDepoisMiss = await obterEstatisticasRedis(redis);
    const chamadasNoMiss = diferencaDeChamadas(estatisticasAntesMiss, estatisticasDepoisMiss);
    expect(chamadasNoMiss.set ?? 0).toBeGreaterThan(0);

    const estatisticasAntesHit = await obterEstatisticasRedis(redis);
    const inicioHit = new Date();

    const respostaHit = await directusFetch(baseUrl, caminho, { token });
    expect(respostaHit.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const queriesNoHit = contarQueriesSql(obterLogsDesde(containerId, inicioHit));
    expect(queriesNoHit).toBe(0);

    const estatisticasDepoisHit = await obterEstatisticasRedis(redis);
    const chamadasNoHit = diferencaDeChamadas(estatisticasAntesHit, estatisticasDepoisHit);
    expect(chamadasNoHit.get ?? 0).toBeGreaterThan(0);
    expect(chamadasNoHit.set ?? 0).toBe(0);
  });
});
