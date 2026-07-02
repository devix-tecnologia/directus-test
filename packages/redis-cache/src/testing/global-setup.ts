import path from "node:path";
import { fileURLToPath } from "node:url";
import { autenticarAdmin, chaveContainer, subirAmbienteDirectus } from "@directus-test/sdk";
import type { TestProject } from "vitest/node";
import { criarFixturesDeCache } from "./fixtures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "d1r3ctus-teste";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
    tokenAdmin: string;
    tokenUsuarioA: string;
    tokenUsuarioB: string;
    colecao: string;
    redisHost: string;
    redisPort: number;
    directusContainerId: string;
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const composeDir = path.resolve(__dirname, "../../docker");

  const ambiente = await subirAmbienteDirectus({
    composeFilePath: composeDir,
    env: { ADMIN_EMAIL, ADMIN_PASSWORD },
  });

  const tokenAdmin = await autenticarAdmin(ambiente.baseUrl, {
    email: ADMIN_EMAIL,
    senha: ADMIN_PASSWORD,
  });

  const fixtures = await criarFixturesDeCache(ambiente.baseUrl, tokenAdmin);

  const redisContainer = ambiente.ambiente.getContainer(chaveContainer("redis"));
  const directusContainer = ambiente.ambiente.getContainer(chaveContainer("directus"));

  project.provide("baseUrl", ambiente.baseUrl);
  project.provide("tokenAdmin", tokenAdmin);
  project.provide("tokenUsuarioA", fixtures.usuarioA.token);
  project.provide("tokenUsuarioB", fixtures.usuarioB.token);
  project.provide("colecao", fixtures.colecao);
  project.provide("redisHost", redisContainer.getHost());
  project.provide("redisPort", redisContainer.getMappedPort(6379));
  project.provide("directusContainerId", directusContainer.getId());

  return async () => {
    await ambiente.parar();
  };
}
