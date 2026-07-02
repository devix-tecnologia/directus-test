import {
  aguardarLogs,
  contarQueriesParaTabela,
  directusFetch,
  obterLogsDesde,
} from "@directus-test/sdk";
import { describe, expect, inject, it } from "vitest";

const CACHE_STATUS_HEADER = "x-directus-cache-status";

describe("cache: auto-purge em escrita (CACHE_AUTO_PURGE=true)", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const tokenAdmin = inject("tokenAdmin");
  const containerId = inject("directusContainerId");

  it("invalida o cache da consulta ao criar um novo item na coleção, forçando nova consulta ao banco", async () => {
    const caminho = `/items/${colecao}?filter[empresa][_eq]=empresa-a&sort=id`;

    const primeira = await directusFetch(baseUrl, caminho, { token: tokenAdmin });
    expect(primeira.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    // espera o log assíncrono do MISS assentar antes de marcar o início da
    // janela do HIT — sem isso, uma query do MISS que ainda não foi escrita
    // no log do container pode ser contada como se fosse do HIT.
    await aguardarLogs();

    const inicioHit = new Date();
    const segunda = await directusFetch(baseUrl, caminho, { token: tokenAdmin });
    expect(segunda.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");
    await aguardarLogs();
    expect(contarQueriesParaTabela(obterLogsDesde(containerId, inicioHit), colecao)).toBe(0);

    await directusFetch(baseUrl, `/items/${colecao}`, {
      method: "POST",
      token: tokenAdmin,
      body: { nome: "Produto A3 (auto-purge)", empresa: "empresa-a" },
    });

    const inicioTerceira = new Date();
    const terceira = await directusFetch(baseUrl, caminho, { token: tokenAdmin });
    expect(terceira.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");
    await aguardarLogs();
    // Prova que o purge forçou uma consulta real ao banco, não só limpou
    // o header de status sem de fato buscar dados novos.
    expect(
      contarQueriesParaTabela(obterLogsDesde(containerId, inicioTerceira), colecao),
    ).toBeGreaterThan(0);

    const itensAntes = (primeira.corpo as { data: unknown[] }).data.length;
    const itensDepois = (terceira.corpo as { data: unknown[] }).data.length;
    expect(itensDepois).toBe(itensAntes + 1);
  });
});
