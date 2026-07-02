import type { Redis } from "ioredis";

export interface EstatisticaComando {
  chamadas: number;
  usecPorChamada: number;
}

export type EstatisticasRedis = Record<string, EstatisticaComando>;

const PADRAO_CMDSTAT = /^cmdstat_(\w+):calls=(\d+),usec=(\d+),usec_per_call=([\d.]+)/;

/**
 * Lê `INFO commandstats` do Redis e devolve o número de chamadas por
 * comando (GET, SET, TTL, etc.) acumulado desde que o Redis subiu.
 * Como o compose sobe um Redis novo por execução, isso equivale ao total
 * daquele teste — mas para isolar uma janela específica, tire um snapshot
 * antes e outro depois e use `diferencaDeChamadas`.
 */
export async function obterEstatisticasRedis(redis: Redis): Promise<EstatisticasRedis> {
  const bruto = await redis.info("commandstats");
  const estatisticas: EstatisticasRedis = {};

  for (const linha of bruto.split("\n")) {
    const match = linha.match(PADRAO_CMDSTAT);
    if (!match) continue;

    const [, comando, chamadas, , usecPorChamada] = match as unknown as [
      string,
      string,
      string,
      string,
      string,
    ];

    estatisticas[comando] = {
      chamadas: Number(chamadas),
      usecPorChamada: Number(usecPorChamada),
    };
  }

  return estatisticas;
}

/** Diferença de chamadas por comando entre dois snapshots (depois - antes). */
export function diferencaDeChamadas(
  antes: EstatisticasRedis,
  depois: EstatisticasRedis,
): Record<string, number> {
  const comandos = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  const diferenca: Record<string, number> = {};

  for (const comando of comandos) {
    diferenca[comando] = (depois[comando]?.chamadas ?? 0) - (antes[comando]?.chamadas ?? 0);
  }

  return diferenca;
}
