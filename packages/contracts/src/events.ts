import { SemanticVersion } from './versioning';

export type EventMeta = {
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  causationId?: string;
  tenantId?: string;
  projectId?: string;
  source: string;
};

export type EventEnvelope<TPayload, TMeta extends EventMeta = EventMeta> = {
  id: string;
  type: string;
  version: SemanticVersion;
  occurredAt: string;
  payload: TPayload;
  meta: TMeta;
};

export type EventContract<TPayload, TMeta extends EventMeta = EventMeta> = {
  type: string;
  version: SemanticVersion;
  schema: string;
  example: EventEnvelope<TPayload, TMeta>;
};
