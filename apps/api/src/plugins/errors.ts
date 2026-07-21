import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "Données invalides", details: error.flatten().fieldErrors });
    }
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    // Erreurs Fastify natives (body invalide, etc.) : conserver leur statut 4xx
    const fastifyError = error as { statusCode?: number; message?: string };
    if (typeof fastifyError.statusCode === "number" && fastifyError.statusCode < 500) {
      return reply.code(fastifyError.statusCode).send({ error: fastifyError.message ?? "Requête invalide" });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "Erreur interne" });
  });
}
