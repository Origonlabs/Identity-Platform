# 🚀 Stack Auth - Enterprise Deployment Guide

Comprehensive guide for deploying Stack Auth to production using Kubernetes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Rate Limiting Configuration](#rate-limiting-configuration)
4. [Load Testing](#load-testing)
5. [Security Scanning](#security-scanning)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Kubernetes Cluster**: 1.24+ (AWS EKS, GCP GKE, Azure AKS, or local with minikube)
- **Helm**: 3.8+
- **kubectl**: Configured for your cluster
- **Docker**: For building images
- **k6**: For load testing (optional)

### Required Resources

- **Minimum**: 3 nodes, 8 vCPUs, 16GB RAM
- **Recommended**: 5+ nodes, 16+ vCPUs, 32GB+ RAM
- **Storage**: 200GB+ SSD for PostgreSQL

### Required Secrets

You'll need to configure the following secrets:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/stackauth"
DATABASE_ENCRYPTION_KEY="your-32-char-encryption-key"

# Redis
REDIS_URL="redis://user:pass@host:6379"

# Authentication
STACK_SECRET_KEY="your-secret-key"
JWT_SECRET="your-jwt-secret"

# OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# Monitoring
SENTRY_DSN="https://..."

# Payment (optional)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."
```

---

## Kubernetes Deployment

### Step 1: Build and Push Docker Image

```bash
# Build the Docker image
docker build -t your-registry/stack-backend:2.8.39 \
  -f docker/server/Dockerfile .

# Push to your container registry
docker push your-registry/stack-backend:2.8.39
```

### Step 2: Create Kubernetes Namespace

```bash
kubectl create namespace stack-auth-prod
```

### Step 3: Create Secrets

```bash
# Create secrets from file
kubectl create secret generic stack-backend-secrets \
  --from-env-file=.env.production \
  --namespace=stack-auth-prod

# Or create secrets individually
kubectl create secret generic stack-backend-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=STACK_SECRET_KEY="..." \
  --namespace=stack-auth-prod
```

**Production Best Practice**: Use external secret management:

```bash
# AWS Secrets Manager
kubectl create secret generic stack-backend-secrets \
  --from-literal=DATABASE_URL="$(aws secretsmanager get-secret-value \
    --secret-id prod/stackauth/database \
    --query SecretString --output text)" \
  --namespace=stack-auth-prod

# Or use External Secrets Operator
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: stack-backend-secrets
  namespace: stack-auth-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: stack-backend-secrets
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: prod/stackauth/database
EOF
```

### Step 4: Install Helm Chart

```bash
# Install with default values
helm install stack-backend \
  ./kubernetes/helm/stack-backend \
  --namespace stack-auth-prod \
  --values kubernetes/helm/stack-backend/values-production.yaml \
  --set image.repository=your-registry/stack-backend \
  --set image.tag=2.8.39

# Or install with custom overrides
helm install stack-backend \
  ./kubernetes/helm/stack-backend \
  --namespace stack-auth-prod \
  --values values-production.yaml \
  --set ingress.hosts[0].host=api.yourdomain.com \
  --set postgresql.primary.persistence.storageClass=gp3 \
  --set autoscaling.minReplicas=5 \
  --set autoscaling.maxReplicas=50
```

### Step 5: Verify Deployment

```bash
# Check pods
kubectl get pods -n stack-auth-prod

# Check services
kubectl get svc -n stack-auth-prod

# Check ingress
kubectl get ingress -n stack-auth-prod

# Check HPA
kubectl get hpa -n stack-auth-prod

# View logs
kubectl logs -n stack-auth-prod -l app.kubernetes.io/name=stack-backend -f

# Check health
kubectl exec -n stack-auth-prod \
  $(kubectl get pod -n stack-auth-prod -l app.kubernetes.io/name=stack-backend -o jsonpath='{.items[0].metadata.name}') \
  -- curl http://localhost:8102/health
```

### Step 6: Configure Ingress & TLS

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# TLS certificate will be automatically provisioned
```

### Step 7: Upgrade Deployment

```bash
# Upgrade to new version
helm upgrade stack-backend \
  ./kubernetes/helm/stack-backend \
  --namespace stack-auth-prod \
  --values values-production.yaml \
  --set image.tag=2.8.40

# Rollback if needed
helm rollback stack-backend 1 --namespace stack-auth-prod
```

---

## Rate Limiting Configuration

### Enable Rate Limiting

The rate limiting middleware is automatically enabled in production. Configure it via environment variables:

```yaml
env:
  REDIS_URL: "redis://your-redis-host:6379"
  UPSTASH_REDIS_REST_URL: "https://..."
  UPSTASH_REDIS_REST_TOKEN: "..."
  SKIP_RATE_LIMIT: "false"  # Set to true to disable in development
```

### Rate Limit Tiers

| Tier | Requests/Hour | Use Case |
|------|---------------|----------|
| FREE | 100 | Free tier users |
| PRO | 1,000 | Paid users |
| ENTERPRISE | 10,000 | Enterprise customers |
| ADMIN | 100,000 | Internal admin operations |

### Endpoint-Specific Limits

| Endpoint | Requests | Window |
|----------|----------|--------|
| `/api/auth/signin` | 5 | 15 minutes |
| `/api/auth/signup` | 3 | 1 hour |
| `/api/auth/reset-password` | 3 | 1 hour |
| `/api/payment` | 10 | 1 hour |

### Set User Tier

Include the tier in the request header:

```bash
curl -H "X-Rate-Limit-Tier: pro" \
     -H "X-User-Id: user123" \
     https://api.yourdomain.com/api/v1/users/me
```

### Monitor Rate Limits

```bash
# Check Redis for rate limit data
redis-cli -h your-redis-host
> KEYS @ratelimit:*
> GET @ratelimit:tier:free:user:user123
```

---

## Load Testing

### Install k6

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Run Load Tests

```bash
# Basic test
k6 run tests/load-testing/k6/auth-flow.js

# With custom environment
BASE_URL=https://api.yourdomain.com \
PROJECT_ID=your-project-id \
k6 run tests/load-testing/k6/auth-flow.js

# Save results to file
k6 run --out json=results.json tests/load-testing/k6/auth-flow.js

# Run with cloud output (k6 cloud required)
k6 run --out cloud tests/load-testing/k6/auth-flow.js
```

### Performance Thresholds

The load test enforces these SLAs:

- **95th percentile**: < 2s
- **99th percentile**: < 5s
- **Error rate**: < 5%
- **Signup time**: < 3s (95th percentile)
- **Signin time**: < 1.5s (95th percentile)
- **Token refresh**: < 500ms (95th percentile)

### CI/CD Integration

Load tests run automatically:

- **Weekly**: Every Sunday at 2 AM UTC
- **On-demand**: Via workflow dispatch in GitHub Actions

```bash
# Trigger via GitHub CLI
gh workflow run load-testing.yaml \
  -f environment=staging \
  -f duration=short
```

---

## Security Scanning

### Automated Security Scans

Security scans run automatically on:

- Every push to `main` and `dev` branches
- Every pull request
- Daily at 3 AM UTC

### Scan Types

1. **Secret Scanning** (Gitleaks)
   - Detects hardcoded secrets in code

2. **SAST** (Semgrep + CodeQL)
   - Static code analysis for vulnerabilities

3. **Dependency Scanning** (Snyk + npm audit)
   - Checks for vulnerable dependencies

4. **Container Scanning** (Trivy)
   - Scans Docker images for CVEs

5. **DAST** (OWASP ZAP)
   - Dynamic application security testing

6. **License Compliance**
   - Ensures dependencies use approved licenses

### Run Security Scans Locally

```bash
# Secret scanning
docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest detect --source /path

# SAST with Semgrep
docker run --rm -v $(pwd):/src returntocorp/semgrep semgrep scan --config=auto

# Dependency scan
pnpm audit --audit-level=moderate

# Container scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image your-registry/stack-backend:2.8.39

# License check
npx license-checker --production --summary
```

### Review Security Reports

All security scan results are available in:

- **GitHub Security Tab**: SARIF uploads
- **Workflow Artifacts**: Detailed JSON reports
- **Pull Request Comments**: Summary reports

---

## Monitoring & Observability

### Prometheus Metrics

The backend exposes metrics at `/metrics`:

```bash
# Check metrics endpoint
curl https://api.yourdomain.com/metrics
```

Install Prometheus ServiceMonitor:

```yaml
serviceMonitor:
  enabled: true
  interval: 15s
  scrapeTimeout: 10s
```

### Key Metrics to Monitor

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `rate_limit_exceeded_total` - Rate limit violations
- `database_connections_active` - Active DB connections
- `redis_operations_total` - Redis operations

### Grafana Dashboards

Import these dashboards:

1. **Kubernetes Dashboard**: ID `15757`
2. **PostgreSQL Dashboard**: ID `9628`
3. **Redis Dashboard**: ID `11835`
4. **NGINX Ingress**: ID `9614`

### Logs

View logs with kubectl:

```bash
# All backend pods
kubectl logs -n stack-auth-prod -l app.kubernetes.io/name=stack-backend -f

# Specific pod
kubectl logs -n stack-auth-prod stack-backend-xxx -f

# Previous container (if crashed)
kubectl logs -n stack-auth-prod stack-backend-xxx --previous
```

### Distributed Tracing

Configure OpenTelemetry:

```yaml
env:
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://jaeger:4318"
  ENABLE_TELEMETRY: "true"
```

View traces at: `http://jaeger-ui:16686`

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n stack-auth-prod

# Describe pod
kubectl describe pod stack-backend-xxx -n stack-auth-prod

# Check events
kubectl get events -n stack-auth-prod --sort-by='.lastTimestamp'

# Common issues:
# - ImagePullBackOff: Wrong image name/tag or missing image pull secret
# - CrashLoopBackOff: Application crash, check logs
# - Pending: Insufficient resources or PVC not bound
```

### Database Connection Issues

```bash
# Test database connection
kubectl exec -n stack-auth-prod -it stack-backend-xxx -- \
  pnpm run db:migrate

# Check PostgreSQL pod
kubectl get pods -n stack-auth-prod -l app.kubernetes.io/name=postgresql

# Check PostgreSQL logs
kubectl logs -n stack-auth-prod -l app.kubernetes.io/name=postgresql
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n stack-auth-prod

# Adjust resource limits
helm upgrade stack-backend ./kubernetes/helm/stack-backend \
  --namespace stack-auth-prod \
  --set resources.limits.memory=8Gi
```

### Rate Limiting Not Working

```bash
# Check Redis connection
kubectl exec -n stack-auth-prod -it stack-backend-xxx -- \
  redis-cli -h stack-backend-redis-master ping

# Check rate limit env vars
kubectl exec -n stack-auth-prod stack-backend-xxx -- env | grep REDIS
```

### Ingress Not Responding

```bash
# Check ingress
kubectl describe ingress -n stack-auth-prod

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check certificates
kubectl get certificate -n stack-auth-prod
kubectl describe certificate stack-backend-tls -n stack-auth-prod
```

---

## Performance Tuning

### PostgreSQL Optimization

```yaml
postgresql:
  primary:
    extraEnvVars:
      - name: POSTGRESQL_MAX_CONNECTIONS
        value: "500"
      - name: POSTGRESQL_SHARED_BUFFERS
        value: "2GB"
      - name: POSTGRESQL_EFFECTIVE_CACHE_SIZE
        value: "6GB"
      - name: POSTGRESQL_WORK_MEM
        value: "16MB"
```

### Redis Optimization

```yaml
redis:
  master:
    extraEnvVars:
      - name: REDIS_MAXMEMORY
        value: "3gb"
      - name: REDIS_MAXMEMORY_POLICY
        value: "allkeys-lru"
```

### Application Tuning

```yaml
env:
  NODE_OPTIONS: "--max-old-space-size=4096"
  MAX_CONCURRENT_REQUESTS: "1000"
  POOL_SIZE: "20"
```

---

## Support

- **Documentation**: https://docs.stack-auth.com
- **GitHub Issues**: https://github.com/stack-auth/stack/issues
- **Discord**: https://discord.gg/stack-auth
- **Email**: support@stack-auth.com

---

**License**: MIT
