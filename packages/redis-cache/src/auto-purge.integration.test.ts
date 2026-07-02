import { directusFetch } from "@directus-test/sdk";
import { describe, expect, inject, it } from "vitest";

const CACHE_STATUS_HEADER = "x-directus-cache-status";

describe("cache: auto-purge em escrita (CACHE_AUTO_PURGE=true)", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const tokenAdmin = inject("tokenAdmin");

  it("invalida o cache da consulta ao criar um novo item na coleção", async () => {
    const caminho = `/items/${colecao}?filter[empresa][_eq]=empresa-a&sort=id`;

    const primeira = await directusFetch(baseUrl, caminho, { token: tokenAdmin });
    expect(primeira.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    const segunda = await directusFetch(baseUrl, caminho, { token: tokenAdmin });
    expect(segunda.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");

    await directusFetch(baseUrl, `/items/${colecao}`, {
      method: "POST",
      token: tokenAdmin,
      body: { nome: "Produto A3 (auto-purge)", empresa: "empresa-a" },
    });

    const terceira = await directusFetch(baseUrl, caminho, { token: tokenAdmin });
    expect(terceira.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    const itensAntes = (primeira.corpo as { data: unknown[] }).data.length;
    const itensDepois = (terceira.corpo as { data: unknown[] }).data.length;
    expect(itensDepois).toBe(itensAntes + 1);
  });
});
