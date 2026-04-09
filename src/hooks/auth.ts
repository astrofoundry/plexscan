import type { FastifyReply, FastifyRequest } from "fastify";

export function authHook(secret: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const provided = request.headers["x-webhook-secret"];
    if (provided !== secret) {
      reply.code(401).send({ error: "unauthorized" });
    }
  };
}
