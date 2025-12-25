import { NotificationEnvelope, NotificationRequest, OAuthConnection, TokenSet } from "@opendex/contracts";

type ApiNotificationBase = {
  channel: "email" | "sms" | "webhook";
  project_id: string;
  tenant_id?: string;
  locale?: string;
  deduplication_key?: string;
  expires_at?: string;
  metadata?: Record<string, string>;
};

type ApiEmailNotification = ApiNotificationBase & {
  channel: "email";
  to: string;
  template_id: string;
  variables?: Record<string, string | number | boolean | null>;
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
};

type ApiSmsNotification = ApiNotificationBase & {
  channel: "sms";
  to: string;
  template_id: string;
  variables?: Record<string, string | number | boolean | null>;
};

type ApiWebhookNotification = ApiNotificationBase & {
  channel: "webhook";
  url: string;
  signature_version: string;
  body: unknown;
};

export type ApiNotificationRequest =
  | ApiEmailNotification
  | ApiSmsNotification
  | ApiWebhookNotification;

export type ApiNotificationEnvelope = {
  id: string;
  request: ApiNotificationRequest;
  status: string;
  created_at: string;
  updated_at: string;
  last_error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
  provider_response_id?: string;
};

type ApiTokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  issued_at: string;
  expires_at?: string;
  id_token?: string;
};

export type ApiOAuthConnectionRequest = {
  id?: string;
  provider_id: string;
  project_id: string;
  tenant_id?: string;
  user_id: string;
  scope: string[];
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
  token_set: ApiTokenSet;
};

export type ApiOAuthConnectionResponse = {
  id: string;
  provider_id: string;
  project_id: string;
  tenant_id?: string;
  user_id: string;
  scope: string[];
  status: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  token_set?: ApiTokenSet;
};

export function toServiceNotificationRequest(input: ApiNotificationRequest): NotificationRequest {
  const base = {
    channel: input.channel,
    projectId: input.project_id,
    tenantId: input.tenant_id,
    locale: input.locale,
    deduplicationKey: input.deduplication_key,
    expiresAt: input.expires_at,
    metadata: input.metadata,
  };

  if (input.channel === "email") {
    return {
      ...base,
      channel: "email",
      to: input.to,
      templateId: input.template_id,
      variables: input.variables,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.reply_to,
    };
  }

  if (input.channel === "sms") {
    return {
      ...base,
      channel: "sms",
      to: input.to,
      templateId: input.template_id,
      variables: input.variables,
    };
  }

  return {
    ...base,
    channel: "webhook",
    url: input.url,
    signatureVersion: input.signature_version,
    body: input.body,
  };
}

export function toApiNotificationEnvelope(input: NotificationEnvelope): ApiNotificationEnvelope {
  const request = input.request;
  const base = {
    channel: request.channel,
    project_id: request.projectId,
    tenant_id: request.tenantId,
    locale: request.locale,
    deduplication_key: request.deduplicationKey,
    expires_at: request.expiresAt,
    metadata: request.metadata,
  };

  let apiRequest: ApiNotificationRequest;
  if (request.channel === "email") {
    apiRequest = {
      ...base,
      channel: "email",
      to: request.to,
      template_id: request.templateId,
      variables: request.variables,
      cc: request.cc,
      bcc: request.bcc,
      reply_to: request.replyTo,
    };
  } else if (request.channel === "sms") {
    apiRequest = {
      ...base,
      channel: "sms",
      to: request.to,
      template_id: request.templateId,
      variables: request.variables,
    };
  } else {
    apiRequest = {
      ...base,
      channel: "webhook",
      url: request.url,
      signature_version: request.signatureVersion,
      body: request.body,
    };
  }

  return {
    id: input.id,
    request: apiRequest,
    status: input.status,
    created_at: input.createdAt,
    updated_at: input.updatedAt,
    last_error: input.lastError,
    provider_response_id: input.providerResponseId,
  };
}

export function toServiceOAuthConnection(input: ApiOAuthConnectionRequest): {
  id?: string;
  providerId: string;
  projectId: string;
  tenantId?: string;
  userId: string;
  scope: string[];
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  tokenSet: TokenSet;
} {
  return {
    id: input.id,
    providerId: input.provider_id,
    projectId: input.project_id,
    tenantId: input.tenant_id,
    userId: input.user_id,
    scope: input.scope,
    expiresAt: input.expires_at,
    createdAt: input.created_at,
    updatedAt: input.updated_at,
    tokenSet: {
      accessToken: input.token_set.access_token,
      refreshToken: input.token_set.refresh_token,
      expiresIn: input.token_set.expires_in,
      tokenType: input.token_set.token_type,
      issuedAt: input.token_set.issued_at,
      expiresAt: input.token_set.expires_at,
      idToken: input.token_set.id_token,
    },
  };
}

export function toApiOAuthConnectionResponse(input: OAuthConnection & { tokenSet?: TokenSet }): ApiOAuthConnectionResponse {
  return {
    id: input.id,
    provider_id: input.providerId,
    project_id: input.projectId,
    tenant_id: input.tenantId,
    user_id: input.userId,
    scope: input.scope,
    status: input.status,
    expires_at: input.expiresAt,
    created_at: input.createdAt,
    updated_at: input.updatedAt,
    token_set: input.tokenSet
      ? {
          access_token: input.tokenSet.accessToken,
          refresh_token: input.tokenSet.refreshToken,
          expires_in: input.tokenSet.expiresIn,
          token_type: input.tokenSet.tokenType,
          issued_at: input.tokenSet.issuedAt,
          expires_at: input.tokenSet.expiresAt,
          id_token: input.tokenSet.idToken,
        }
      : undefined,
  };
}
