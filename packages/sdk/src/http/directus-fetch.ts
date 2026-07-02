export interface RespostaDirectus<T = unknown> {
  status: number;
  headers: Headers;
  corpo: T;
}

export interface DirectusFetchOpts {
  method?: string;
  token?: string;
  body?: unknown;
}

/**
 * Wrapper fino sobre `fetch` nativo que preserva acesso aos headers da
 * resposta (ex.: X-Directus-Cache-Status), algo que o @directus/sdk
 * oficial não expõe de forma direta.
 */
export async function directusFetch<T = unknown>(
  baseUrl: string,
  path: string,
  opts: DirectusFetchOpts = {},
): Promise<RespostaDirectus<T>> {
  const { method = "GET", token, body } = opts;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);

  const resposta = await fetch(new URL(path, baseUrl), init);

  const corpo = (await resposta.json().catch(() => undefined)) as T;

  return { status: resposta.status, headers: resposta.headers, corpo };
}
