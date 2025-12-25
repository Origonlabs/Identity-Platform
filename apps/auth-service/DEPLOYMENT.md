# 🚀 Deployment Guide

## Overview

This document provides deployment instructions for the Auth Service microservice.

## 📋 Prerequisites

- Kubernetes cluster (1.24+) or Docker Swarm
- PostgreSQL database (managed or self-hosted)
- Redis cache (managed or self-hosted)
- Domain with SSL certificate
- OAuth provider credentials (GitHub, Google, etc.)

## 🐳 Docker Deployment

### 1. Build Image

```bash
docker build -t auth-service:1.0.0 .
```

### 2. Push to Registry

```bash
# Tag for your registry
docker tag auth-service:1.0.0 your-registry.com/auth-service:1.0.0

# Push
docker push your-registry.com/auth-service:1.0.0
```

### 3. Run with Docker Compose

```bash
# Production
docker-compose -f docker-compose.yml up -d

# With monitoring
docker-compose --profile monitoring up -d
```

## ☸️ Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace auth-service
```

### 2. Create Secrets

```bash
# Database credentials
kubectl create secret generic db-credentials \
  --from-literal=url='postgresql://user:pass@host:5432/db' \
  -n auth-service

# OAuth credentials
kubectl create secret generic oauth-credentials \
  --from-literal=github-client-id='your-id' \
  --from-literal=github-client-secret='your-secret' \
  --from-literal=google-client-id='your-id' \
  --from-literal=google-client-secret='your-secret' \
  -n auth-service

# JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=secret='your-super-secret-key' \
  -n auth-service
```

### 3. Apply Manifests

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry.com/auth-service:1.0.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: OAUTH_GITHUB_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oauth-credentials
              key: github-client-id
        - name: OAUTH_GITHUB_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth-credentials
              key: github-client-secret
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: auth-service
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auth-service
  namespace: auth-service
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - auth.yourdomain.com
    secretName: auth-tls
  rules:
  - host: auth.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
```

```bash
kubectl apply -f deployment.yaml
```

### 4. Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service
  namespace: auth-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f hpa.yaml
```

## 🔐 Security Checklist

- [ ] Use HTTPS/TLS everywhere
- [ ] Set strong JWT secret (32+ characters)
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use secure session cookies
- [ ] Enable Sentry error tracking
- [ ] Set up database backups
- [ ] Use secrets management (Vault, AWS Secrets Manager)
- [ ] Enable audit logging
- [ ] Configure firewall rules
- [ ] Use non-root Docker user
- [ ] Scan images for vulnerabilities
- [ ] Enable pod security policies

## 📊 Monitoring

### Sentry Setup

```bash
export SENTRY_DSN=your-sentry-dsn
```

### Prometheus Metrics

Metrics available at `/metrics`:
- HTTP request duration
- Request count by status code
- Active connections
- Database query performance

### Grafana Dashboards

Import pre-built dashboards for:
- API performance
- OAuth flow metrics
- Error rates
- Resource utilization

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build image
        run: docker build -t auth-service:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker tag auth-service:${{ github.sha }} registry.com/auth-service:latest
          docker push registry.com/auth-service:latest

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/auth-service \
            auth-service=registry.com/auth-service:${{ github.sha }} \
            -n auth-service
```

## 🔧 Production Tuning

### Node.js

```bash
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048"
```

### PostgreSQL

- Enable connection pooling
- Set appropriate pool size (10-20)
- Configure statement timeout
- Enable query logging for slow queries

### Redis

- Enable persistence (AOF)
- Set max memory policy
- Configure eviction policy
- Enable clustering for HA

## 📈 Scaling

### Horizontal Scaling

- Use HPA based on CPU/Memory
- Consider custom metrics (request rate)
- Scale database read replicas

### Vertical Scaling

- Increase pod resources
- Optimize database queries
- Implement caching strategy

## 🆘 Troubleshooting

### Common Issues

**High Memory Usage**
```bash
# Check memory
kubectl top pods -n auth-service

# Increase limits
kubectl edit deployment auth-service -n auth-service
```

**Database Connection Issues**
```bash
# Check connection
kubectl logs -n auth-service deployment/auth-service

# Verify secrets
kubectl get secret db-credentials -n auth-service -o yaml
```

**OAuth Provider Errors**
- Verify redirect URIs match
- Check credentials are correct
- Ensure provider API is accessible

## 📝 Rollback

```bash
# View deployment history
kubectl rollout history deployment/auth-service -n auth-service

# Rollback to previous version
kubectl rollout undo deployment/auth-service -n auth-service

# Rollback to specific revision
kubectl rollout undo deployment/auth-service --to-revision=2 -n auth-service
```

## 🔍 Health Checks

```bash
# Liveness
curl https://auth.yourdomain.com/api/health/live

# Readiness
curl https://auth.yourdomain.com/api/health/ready

# Full health
curl https://auth.yourdomain.com/api/health
```

## 📞 Support

For deployment issues, please:
1. Check logs: `kubectl logs -n auth-service deployment/auth-service`
2. Review metrics in Grafana
3. Open an issue on GitHub

---

**Happy Deploying! 🚀**
