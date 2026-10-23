import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import logger from "./utils/logger";
import { closeDatabase, initializeDatabase } from "./database";

const PORT = process.env.PORT || "8080";

async function main() {
  try {
    await initializeDatabase();
  } catch (error) {
    logger.error('Banco indisponível; API não será exposta: ' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
    return;
  }

  const server = app.listen(PORT, () => {
    logger.info(`Servidor pronto na porta ${PORT}`);
  });

  gracefulShutdown(server, {
    onShutdown: async () => {
      logger.info('Iniciando shutdown gracioso do servidor...');
      await closeDatabase();
    },
    finally: () => {
      logger.info('Servidor finalizado com sucesso.');
    }
  });
}

void main();
