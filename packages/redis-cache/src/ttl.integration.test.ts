import { directusFetch } from "@directus-test/sdk";
import { Redis } from "ioredis";
import { describe, expect, inject, it } from "vitest";

describe("cache: TTL configurado (CACHE_TTL)", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const token = inject("tokenUsuarioB");
  const redisHost = inject("redisHost");
  const redisPort = inject("redisPort");

  it("grava a chave de cache no Redis com TTL condizente com CACHE_TTL (1h)", async () => {
    const caminho = `/items/${colecao}?filter[empresa][_eq]=empresa-b`;
    await directusFetch(baseUrl, caminho, { token });

    const redis = new Redis({ host: redisHost, port: redisPort });

    try {
      const chaves = await redis.keys("*directus-test-cache*");
      const chaveDeDados = chaves.find((chave: string) => !chave.endsWith("__expires_at"));
      expect(chaveDeDados).toBeDefined();

      const ttlSegundos = await redis.ttl(chaveDeDados as string);

      // CACHE_TTL do docker-compose está configurado para 1h (3600s); o TTL
      // real gravado deve estar próximo disso, nunca maior.
      expect(ttlSegundos).toBeGreaterThan(3500);
      expect(ttlSegundos).toBeLessThanOrEqual(3600);
    } finally {
      redis.disconnect();
    }
  });
});
