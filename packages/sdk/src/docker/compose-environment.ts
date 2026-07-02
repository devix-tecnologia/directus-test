import { execFileSync } from "node:child_process";
import {
  DockerComposeEnvironment,
  type StartedDockerComposeEnvironment,
  Wait,
} from "testcontainers";

export interface AmbienteDirectus {
  /** URL base do Directus já com a porta mapeada dinamicamente pelo Docker. */
  baseUrl: string;
  /** Container Docker compose já iniciado, para acesso a outros serviços (ex.: Redis). */
  ambiente: StartedDockerComposeEnvironment;
  /** Derruba todos os containers do compose e limpa qualquer estado. */
  parar: () => Promise<void>;
}

export interface SubirAmbienteDirectusOpts {
  /** Diretório onde está o docker-compose.yml. */
  composeFilePath: string;
  /** Nome do arquivo de compose, relativo a composeFilePath. */
  composeFile?: string;
  /** Nome do serviço do Directus dentro do compose. */
  servicoDirectus?: string;
  /** Porta interna exposta pelo Directus. */
  portaDirectus?: number;
  /** Caminho usado para aguardar o Directus ficar saudável. */
  caminhoHealthcheck?: string;
  /** Variáveis de ambiente adicionais/overrides para os serviços do compose. */
  env?: Record<string, string>;
  /** Tempo máximo de espera pela subida do Directus, em ms. */
  timeoutMs?: number;
}

/**
 * O testcontainers identifica containers do compose pela chave
 * "<serviço>-1" (convenção de nomes do Docker Compose V2 para um único
 * replica). Usamos essa mesma chave tanto para registrar a wait strategy
 * quanto para buscar containers depois — caso contrário a wait strategy
 * customizada é ignorada silenciosamente e cai no default (espera de
 * porta com timeout fixo de 60s).
 */
function chaveContainer(servico: string): string {
  return `${servico}-1`;
}

/**
 * O testcontainers só sabe detectar o socket padrão do Docker Desktop (ou
 * variantes rootless conhecidas) — não reconhece o Docker context ativo.
 * Em máquinas usando Colima, Rancher Desktop, OrbStack etc. via `docker
 * context use`, isso resulta em "Could not find a working container
 * runtime strategy" mesmo com o Docker rodando normalmente.
 *
 * Aqui resolvemos o DOCKER_HOST a partir do context ativo (se ainda não
 * estiver definido) para que a suíte funcione sem passos manuais em
 * qualquer engine compatível com `docker context`.
 */
function configurarAmbienteDocker(): void {
  if (!process.env.DOCKER_HOST) {
    try {
      const host = execFileSync(
        "docker",
        ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"],
        { encoding: "utf-8" },
      ).trim();

      if (host) process.env.DOCKER_HOST = host;
    } catch {
      // Sem `docker` no PATH ou sem context ativo — deixa o testcontainers
      // seguir com a própria detecção padrão.
    }
  }

  // O container "Ryuk" (limpeza automática de órfãos) falha em alguns
  // engines não-Docker-Desktop (ex.: Colima). Cada `subirAmbienteDirectus`
  // já deriva um `parar()` que faz o teardown explícito, então desabilitar
  // o Ryuk aqui é seguro — a menos que o usuário já tenha definido a
  // variável explicitamente.
  if (process.env.TESTCONTAINERS_RYUK_DISABLED === undefined) {
    process.env.TESTCONTAINERS_RYUK_DISABLED = "true";
  }
}

export async function subirAmbienteDirectus(
  opts: SubirAmbienteDirectusOpts,
): Promise<AmbienteDirectus> {
  configurarAmbienteDocker();

  const {
    composeFilePath,
    composeFile = "docker-compose.yml",
    servicoDirectus = "directus",
    portaDirectus = 8055,
    caminhoHealthcheck = "/server/health",
    env = {},
    timeoutMs = 120_000,
  } = opts;

  let ambienteCompose = new DockerComposeEnvironment(composeFilePath, composeFile).withWaitStrategy(
    chaveContainer(servicoDirectus),
    Wait.forHttp(caminhoHealthcheck, portaDirectus).withStartupTimeout(timeoutMs),
  );

  if (Object.keys(env).length > 0) {
    ambienteCompose = ambienteCompose.withEnvironment(env);
  }

  const ambiente = await ambienteCompose.up();

  const container = ambiente.getContainer(chaveContainer(servicoDirectus));
  const baseUrl = `http://${container.getHost()}:${container.getMappedPort(portaDirectus)}`;

  return {
    baseUrl,
    ambiente,
    parar: async () => {
      await ambiente.down();
    },
  };
}

export { chaveContainer };
