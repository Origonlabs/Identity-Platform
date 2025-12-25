import fs from "fs";
import { SignJWT } from "jose";
import { Agent as UndiciAgent, Dispatcher } from "undici";
import { getEnvVariable } from "@opendex/stack-shared/dist/utils/env";
import { StatusError } from "@opendex/stack-shared/dist/utils/errors";

type ServiceName = "notifications" | "oauth-connections";

const serviceEnvVars = new Map<ServiceName, string>([
  ["notifications", "NOTIFICATIONS_SERVICE_URL"],
  ["oauth-connections", "OAUTH_CONNECTIONS_SERVICE_URL"],
]);

const DEFAULT_TIMEOUT_MS = 8000;
const INTERNAL_TOKEN_ENV = "INTERNAL_SERVICE_TOKEN";
const INTERNAL_JWT_SECRET_ENV = "INTERNAL_SERVICE_JWT_SECRET";
const INTERNAL_JWT_SECRETS_ENV = "INTERNAL_SERVICE_JWT_SECRETS";
const INTERNAL_MTLS_CA_FILE = "INTERNAL_MTLS_CA_FILE";
const INTERNAL_MTLS_CERT_FILE = "INTERNAL_MTLS_CERT_FILE";
const INTERNAL_MTLS_KEY_FILE = "INTERNAL_MTLS_KEY_FILE";
const INTERNAL_MTLS_REJECT_UNAUTHORIZED = "INTERNAL_MTLS_REJECT_UNAUTHORIZED";
const NODE_ENV = getEnvVariable("NODE_ENV", "");

let warnedStaticInProd = false;
let warnedNoMtls = false;
let cachedDispatcher: Dispatcher | null = null;

type JwtSecret = { kid: string; secret: string };

function parseJwtSecrets(): JwtSecret[] {
  const secretsEnv = getEnvVariable(INTERNAL_JWT_SECRETS_ENV, "");
  if (secretsEnv) {
    return secretsEnv
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [kid, ...secretParts] = entry.split(":");
        const secret = secretParts.join(":");
        if (!kid || !secret) {
          throw new StatusError(500, `Invalid ${INTERNAL_JWT_SECRETS_ENV} entry '${entry}', expected kid:secret`);
        }
        return { kid, secret };
      });
  }

  const singleSecret = getEnvVariable(INTERNAL_JWT_SECRET_ENV, "");
  if (singleSecret) {
    return [{ kid: "primary", secret: singleSecret }];
  }
  return [];
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getServiceBaseUrl(service: ServiceName) {
  const envVar = serviceEnvVars.get(service);
  const raw = envVar ? getEnvVariable(envVar, "") : "";
  if (!raw) {
    throw new StatusError(500, `${envVar} is not set`);
  }
  return normalizeBaseUrl(raw);
}

let cachedDispatcher: Dispatcher | null = null;

function getMtlsDispatcher(): Dispatcher | null {
  if (cachedDispatcher !== null) return cachedDispatcher;

  const caFile = getEnvVariable(INTERNAL_MTLS_CA_FILE, "");
  const certFile = getEnvVariable(INTERNAL_MTLS_CERT_FILE, "");
  const keyFile = getEnvVariable(INTERNAL_MTLS_KEY_FILE, "");
  const rejectUnauthorizedEnv = getEnvVariable(INTERNAL_MTLS_REJECT_UNAUTHORIZED, "");
  const rejectUnauthorized = rejectUnauthorizedEnv ? rejectUnauthorizedEnv !== "false" : true;

  if (!caFile && !certFile && !keyFile) {
    if (NODE_ENV === "production" && !warnedNoMtls) {
      warnedNoMtls = true;
      // eslint-disable-next-line no-console
      console.warn("[microservices] INTERNAL_MTLS_* not set; service-to-service calls are not using mTLS.");
    }
    cachedDispatcher = null;
    return null;
  }

  const tlsOptions: any = {
    rejectUnauthorized,
  };

  if (caFile) tlsOptions.ca = fs.readFileSync(caFile, "utf8");
  if (certFile) tlsOptions.cert = fs.readFileSync(certFile, "utf8");
  if (keyFile) tlsOptions.key = fs.readFileSync(keyFile, "utf8");

  cachedDispatcher = new UndiciAgent({
    connect: {
      ...tlsOptions,
    },
  });
  return cachedDispatcher;
}

async function getInternalServiceToken(service: ServiceName) {
  const jwtSecrets = parseJwtSecrets();
  const jwtSecret = jwtSecrets[0];
  if (jwtSecret) {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ svc: service })
      .setProtectedHeader({ alg: "HS256", kid: jwtSecret.kid })
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .setIssuer("stack-backend")
      .setAudience("internal-services")
      .setSubject(service)
      .sign(new TextEncoder().encode(jwtSecret.secret));
    return token;
  }

  const token = getEnvVariable(INTERNAL_TOKEN_ENV, "");
  if (!token) {
    throw new StatusError(500, `${INTERNAL_TOKEN_ENV} or ${INTERNAL_JWT_SECRET_ENV}/${INTERNAL_JWT_SECRETS_ENV} is not set`);
  }
  if (NODE_ENV === "production" && !warnedStaticInProd) {
    warnedStaticInProd = true;
    // eslint-disable-next-line no-console
    console.warn("[microservices] Using static INTERNAL_SERVICE_TOKEN in production. Prefer JWT secrets and mTLS.");
  }
  return token;
}

export async function fetchServiceJson<T>(
  service: ServiceName,
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
  }
): Promise<T> {
  const baseUrl = getServiceBaseUrl(service);
  const url = new URL(path.replace(/^\/+/, ""), `${baseUrl}/`);
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const serviceToken = await getInternalServiceToken(service);
  const dispatcher = getMtlsDispatcher();

  try {
    const res = await fetch(url, {
      method: options?.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(options?.body ? { "content-type": "application/json" } : {}),
        "x-internal-service-token": serviceToken,
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new StatusError(res.status, `Service ${service} error: ${text || res.statusText}`);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new StatusError(504, `Service ${service} timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
