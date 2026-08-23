import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { z, ZodError } from "zod";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: "validation_error",
        details: z.treeifyError(err),
      },
      400,
    );
  }

  console.error(err);
  return c.json({ error: "internal_server_error" }, 500);
};
