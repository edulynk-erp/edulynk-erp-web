import { z } from '@/lib/validation/zod';

/** The common/v1 error envelope from edulynk-api-contracts. */
export const fieldErrorSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});

export const errorEnvelopeSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  code: z.string(),
  message: z.string(),
  details: z.union([z.string(), z.array(fieldErrorSchema)]).optional(),
  requestId: z.string().optional(),
  path: z.string().optional(),
  timestamp: z.string().optional(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export function parseErrorEnvelope(body: unknown): ErrorEnvelope | undefined {
  const parsed = errorEnvelopeSchema.safeParse(body);
  return parsed.success ? parsed.data : undefined;
}

const REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export function buildErrorEnvelope(input: {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  path: string;
  details?: ErrorEnvelope['details'];
}): ErrorEnvelope {
  return {
    statusCode: input.statusCode,
    error: REASON_PHRASES[input.statusCode] ?? 'Error',
    code: input.code,
    message: input.message,
    ...(input.details === undefined ? {} : { details: input.details }),
    requestId: input.requestId,
    path: input.path,
    timestamp: new Date().toISOString(),
  };
}
