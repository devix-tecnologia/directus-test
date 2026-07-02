import { criarUsuarioComPermissao, directusFetch } from "@directus-test/sdk";

export const COLECAO_TESTE = "produtos_teste";

export interface UsuarioFixture {
  id: string;
  token: string;
  empresa: string;
}

export interface FixturesDeCache {
  colecao: string;
  usuarioA: UsuarioFixture;
  usuarioB: UsuarioFixture;
}

/**
 * Cria a coleção de teste com um campo `empresa`, duas roles/policies com
 * permissão de leitura restrita à própria empresa, dois usuários (um por
 * empresa) e alguns itens seed — base para os testes de isolamento de
 * cache por usuário.
 */
export async function criarFixturesDeCache(
  baseUrl: string,
  tokenAdmin: string,
): Promise<FixturesDeCache> {
  await directusFetch(baseUrl, "/collections", {
    method: "POST",
    token: tokenAdmin,
    body: {
      collection: COLECAO_TESTE,
      schema: {},
      meta: { singleton: false },
      fields: [
        {
          field: "id",
          type: "integer",
          meta: { hidden: true, interface: "input" },
          schema: { is_primary_key: true, has_auto_increment: true },
        },
        { field: "nome", type: "string" },
        { field: "empresa", type: "string" },
      ],
    },
  });

  const usuarioA = await criarUsuarioComPermissao({
    baseUrl,
    tokenAdmin,
    nomePapel: "empresa-a",
    colecao: COLECAO_TESTE,
    filtroPermissao: { empresa: { _eq: "empresa-a" } },
    email: "usuario-a@example.com",
    senha: "senha-usuario-a",
  });

  const usuarioB = await criarUsuarioComPermissao({
    baseUrl,
    tokenAdmin,
    nomePapel: "empresa-b",
    colecao: COLECAO_TESTE,
    filtroPermissao: { empresa: { _eq: "empresa-b" } },
    email: "usuario-b@example.com",
    senha: "senha-usuario-b",
  });

  await directusFetch(baseUrl, `/items/${COLECAO_TESTE}`, {
    method: "POST",
    token: tokenAdmin,
    body: [
      { nome: "Produto A1", empresa: "empresa-a" },
      { nome: "Produto A2", empresa: "empresa-a" },
      { nome: "Produto B1", empresa: "empresa-b" },
    ],
  });

  return {
    colecao: COLECAO_TESTE,
    usuarioA: { ...usuarioA, empresa: "empresa-a" },
    usuarioB: { ...usuarioB, empresa: "empresa-b" },
  };
}
