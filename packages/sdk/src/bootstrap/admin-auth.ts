import { directusFetch } from "../http/directus-fetch.js";

export interface CredenciaisAdmin {
  email: string;
  senha: string;
}

interface RespostaLogin {
  data: {
    access_token: string;
  };
}

export async function autenticarAdmin(
  baseUrl: string,
  credenciais: CredenciaisAdmin,
): Promise<string> {
  const resposta = await directusFetch<RespostaLogin>(baseUrl, "/auth/login", {
    method: "POST",
    body: { email: credenciais.email, password: credenciais.senha },
  });

  if (resposta.status !== 200) {
    throw new Error(`Falha ao autenticar admin em ${baseUrl}: status ${resposta.status}`);
  }

  return resposta.corpo.data.access_token;
}
