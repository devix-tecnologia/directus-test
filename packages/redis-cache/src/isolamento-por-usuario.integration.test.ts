import { directusFetch } from "@directus-test/sdk";
import { describe, expect, inject, it } from "vitest";

const CACHE_STATUS_HEADER = "x-directus-cache-status";

describe("cache: isolamento entre usuários", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const tokenA = inject("tokenUsuarioA");
  const tokenB = inject("tokenUsuarioB");

  it("mesma URL para usuários diferentes gera caches isolados e sem vazamento de dado", async () => {
    const caminho = `/items/${colecao}`;

    const missA = await directusFetch(baseUrl, caminho, { token: tokenA });
    expect(missA.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    const missB = await directusFetch(baseUrl, caminho, { token: tokenB });
    expect(missB.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    const hitA = await directusFetch(baseUrl, caminho, { token: tokenA });
    expect(hitA.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");

    const hitB = await directusFetch(baseUrl, caminho, { token: tokenB });
    expect(hitB.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");

    // Cada usuário só enxerga os itens da própria empresa (permissão de
    // linha) mesmo fazendo a mesma URL/filtros — sem vazamento entre caches.
    expect(hitA.corpo).not.toEqual(hitB.corpo);
  });
});
