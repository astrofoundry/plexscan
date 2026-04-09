export interface Logger {
  info(data: Record<string, unknown>, msg: string): void;
  error(data: Record<string, unknown>, msg: string): void;
}

export function createLogger(): Logger {
  return {
    info(data, msg) {
      console.log(JSON.stringify({ level: "info", time: Date.now(), msg, ...data }));
    },
    error(data, msg) {
      console.error(JSON.stringify({ level: "error", time: Date.now(), msg, ...data }));
    },
  };
}
