import {
  aguardarLogs,
  contarQueriesParaTabela,
  directusFetch,
  obterLogsDesde,
} from "@directus-test/sdk";
import { describe, expect, inject, it } from "vitest";

const CACHE_STATUS_HEADER = "x-directus-cache-status";

describe("cache: isolamento entre usuários", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const tokenA = inject("tokenUsuarioA");
  const tokenB = inject("tokenUsuarioB");
  const containerId = inject("directusContainerId");

  it("mesma URL para usuários diferentes gera caches isolados, cada MISS bate no banco de verdade, e sem vazamento de dado", async () => {
    const caminho = `/items/${colecao}`;

    const inicioMissA = new Date();
    const missA = await directusFetch(baseUrl, caminho, { token: tokenA });
    expect(missA.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");
    await aguardarLogs();
    expect(
      contarQueriesParaTabela(obterLogsDesde(containerId, inicioMissA), colecao),
    ).toBeGreaterThan(0);

    const inicioMissB = new Date();
    const missB = await directusFetch(baseUrl, caminho, { token: tokenB });
    expect(missB.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");
    await aguardarLogs();
    // Prova que o MISS de B é um MISS de verdade: bateu no banco de novo,
    // em vez de reaproveitar a chave de cache gravada por A.
    expect(
      contarQueriesParaTabela(obterLogsDesde(containerId, inicioMissB), colecao),
    ).toBeGreaterThan(0);

    const inicioHits = new Date();
    const hitA = await directusFetch(baseUrl, caminho, { token: tokenA });
    expect(hitA.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");

    const hitB = await directusFetch(baseUrl, caminho, { token: tokenB });
    expect(hitB.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");

    await aguardarLogs();
    expect(contarQueriesParaTabela(obterLogsDesde(containerId, inicioHits), colecao)).toBe(0);

    // Cada usuário só enxerga os itens da própria empresa (permissão de
    // linha) mesmo fazendo a mesma URL/filtros — sem vazamento entre caches.
    expect(hitA.corpo).not.toEqual(hitB.corpo);
  });
});
