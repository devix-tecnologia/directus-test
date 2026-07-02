import type { Page } from "playwright";

export interface CredenciaisLoginAdminApp {
  email: string;
  senha: string;
}

/**
 * Faz login no Admin App do Directus (interface web), para testes E2E que
 * precisam interagir com a UI. Requer `playwright` instalado pelo pacote
 * consumidor (peerDependency opcional deste SDK).
 */
export async function loginAdminApp(
  page: Page,
  baseUrl: string,
  credenciais: CredenciaisLoginAdminApp,
): Promise<void> {
  await page.goto(new URL("/admin/login", baseUrl).toString());
  await page.getByLabel(/email/i).fill(credenciais.email);
  await page.getByLabel(/senha|password/i).fill(credenciais.senha);
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await page.waitForURL(/\/admin\/content|\/admin\/collections|\/admin$/);
}
