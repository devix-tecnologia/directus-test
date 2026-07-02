import { directusFetch } from "../http/directus-fetch.js";

export interface CriarUsuarioComPermissaoOpts {
  baseUrl: string;
  tokenAdmin: string;
  /** Nome da role/policy a criar, ex.: "empresa-a". */
  nomePapel: string;
  /** Coleção sobre a qual aplicar a permissão de leitura. */
  colecao: string;
  /** Filtro de permissão de linha (mesmo formato de `permissions` do Directus), ex.: { empresa: { _eq: "a" } }. */
  filtroPermissao: Record<string, unknown>;
  email: string;
  senha: string;
}

export interface UsuarioDeTeste {
  id: string;
  token: string;
}

interface RespostaComId {
  data: { id: string };
}

/**
 * Cria uma role, uma policy com permissão de leitura filtrada por linha
 * (`filtroPermissao`), vincula a policy à role, e cria um usuário nessa
 * role já autenticado. Usado para testar cenários de isolamento entre
 * usuários com acessos diferentes.
 */
export async function criarUsuarioComPermissao(
  opts: CriarUsuarioComPermissaoOpts,
): Promise<UsuarioDeTeste> {
  const { baseUrl, tokenAdmin, nomePapel, colecao, filtroPermissao, email, senha } = opts;

  const papel = await directusFetch<RespostaComId>(baseUrl, "/roles", {
    method: "POST",
    token: tokenAdmin,
    body: { name: nomePapel },
  });

  const politica = await directusFetch<RespostaComId>(baseUrl, "/policies", {
    method: "POST",
    token: tokenAdmin,
    body: { name: `${nomePapel}-policy`, admin_access: false, app_access: true },
  });

  await directusFetch(baseUrl, "/access", {
    method: "POST",
    token: tokenAdmin,
    body: { role: papel.corpo.data.id, policy: politica.corpo.data.id },
  });

  await directusFetch(baseUrl, "/permissions", {
    method: "POST",
    token: tokenAdmin,
    body: {
      policy: politica.corpo.data.id,
      collection: colecao,
      action: "read",
      permissions: filtroPermissao,
      fields: ["*"],
    },
  });

  const usuario = await directusFetch<RespostaComId>(baseUrl, "/users", {
    method: "POST",
    token: tokenAdmin,
    body: { email, password: senha, role: papel.corpo.data.id },
  });

  const login = await directusFetch<{ data: { access_token: string } }>(baseUrl, "/auth/login", {
    method: "POST",
    body: { email, password: senha },
  });

  if (login.status !== 200) {
    throw new Error(`Falha ao autenticar usuário de teste ${email}: status ${login.status}`);
  }

  return { id: usuario.corpo.data.id, token: login.corpo.data.access_token };
}
