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

/**
 * Conta apenas as queries que tocam uma tabela/coleção específica.
 *
 * O Directus consulta o banco em toda requisição autenticada só para
 * resolver accountability/permissões do token (`getAccountabilityForToken`),
 * independente de a resposta ser HIT ou MISS de cache. `contarQueriesSql`
 * pegaria essa query de autenticação junto com as de dados de verdade — use
 * esta função quando o que importa é "quantas vezes os DADOS da coleção X
 * foram buscados no banco", não "houve alguma atividade no banco".
 */
export function contarQueriesParaTabela(linhas: string[], tabela: string): number {
  const padraoTabela = new RegExp(`["'\`]?${tabela}["'\`]?`, "i");

  return linhas.filter((linha) => PADRAO_QUERY_SQL.test(linha) && padraoTabela.test(linha)).length;
}

/**
 * Espera o log assíncrono do container ser escrito antes de ler com
 * `obterLogsDesde`. Sem isso, uma leitura logo após a requisição pode
 * não ver a linha da query ainda.
 */
export function aguardarLogs(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
