import { directusFetch } from "@directus-test/sdk";
import { describe, expect, inject, it } from "vitest";

const CACHE_STATUS_HEADER = "x-directus-cache-status";

describe("cache: mesmo usuário, mesma consulta", () => {
  const baseUrl = inject("baseUrl");
  const colecao = inject("colecao");
  const token = inject("tokenUsuarioA");

  it("dá MISS na primeira chamada e HIT na segunda, com o mesmo corpo", async () => {
    const caminho = `/items/${colecao}?filter[empresa][_eq]=empresa-a&sort=id`;

    const primeira = await directusFetch(baseUrl, caminho, { token });
    expect(primeira.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");

    const segunda = await directusFetch(baseUrl, caminho, { token });
    expect(segunda.headers.get(CACHE_STATUS_HEADER)).toBe("HIT");
    expect(segunda.corpo).toEqual(primeira.corpo);
  });

  it("mudar o filtro gera uma nova chave de cache (MISS)", async () => {
    const resposta = await directusFetch(
      baseUrl,
      `/items/${colecao}?filter[empresa][_eq]=empresa-a&limit=1`,
      {
        token,
      },
    );

    expect(resposta.headers.get(CACHE_STATUS_HEADER)).toBe("MISS");
  });
});
