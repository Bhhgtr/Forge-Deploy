import pino from "pino";
import { config } from "../control-plane/src/config/index.js";

const loggerOptions = !config.runtime.isProduction
  ? {
      level: config.logging.level,
      transport: {
        target: "pino-pretty",
      },
    }
  : {
      level: config.logging.level,
    };

export const logger = pino(loggerOptions);
