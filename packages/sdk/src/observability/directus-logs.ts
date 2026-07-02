import { execFileSync } from "node:child_process";

const PADRAO_QUERY_SQL = /\b(select|insert|update|delete|pragma)\b/i;

/**
 * Busca as linhas de log de um container Docker desde um instante,
 * via `docker logs --since`. Requer `LOG_LEVEL=trace` no Directus para
 * que as queries SQL apareçam no log (ver database/index.ts do Directus,
 * que loga cada query com sua duração nesse nível).
 */
export function obterLogsDesde(containerId: string, desde: Date): string[] {
  const saida = execFileSync("docker", ["logs", containerId, "--since", desde.toISOString()], {
    encoding: "utf-8",
  });

  return saida.split("\n").filter((linha) => linha.trim().length > 0);
}

/** Conta quantas linhas de log correspondem a uma query SQL executada pelo Directus. */
export function contarQueriesSql(linhas: string[]): number {
  return linhas.filter((linha) => PADRAO_QUERY_SQL.test(linha)).length;
}
