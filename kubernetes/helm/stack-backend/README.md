# Stack Auth Backend Helm Chart

Enterprise-grade Kubernetes deployment for Stack Auth Backend.

## Prerequisites

- Kubernetes 1.24+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure
- Ingress controller (nginx recommended)
- cert-manager (for TLS certificates)

## Installing the Chart

### Quick Start

```bash
# Add the Helm repository (if published)
helm repo add stack-auth https://helm.stack-auth.com
helm repo update

# Install with default values
helm install my-stack-backend stack-auth/stack-backend

# Install with custom values
helm install my-stack-backend stack-auth/stack-backend -f values-production.yaml
```

### Local Development

```bash
# Install from local directory
helm install my-stack-backend ./kubernetes/helm/stack-backend \
  --namespace stack-auth \
  --create-namespace
```

## Configuration

### Required Configuration

The following values must be configured before deploying to production:

```yaml
secrets:
  DATABASE_URL: "postgresql://user:password@host:5432/stackauth"
  STACK_SECRET_KEY: "your-secret-key"
  JWT_SECRET: "your-jwt-secret"
```

### Recommended Production Values

```yaml
replicaCount: 3

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20

ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: api.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: stack-backend-tls
      hosts:
        - api.yourdomain.com

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 500m
    memory: 1Gi

postgresql:
  enabled: true
  primary:
    persistence:
      size: 100Gi
      storageClass: "gp3"

redis:
  enabled: true
  master:
    persistence:
      size: 20Gi
```

## Parameters

### Global Parameters

| Name | Description | Default |
|------|-------------|---------|
| `replicaCount` | Number of replicas | `3` |
| `image.repository` | Image repository | `stackauth/stack-backend` |
| `image.tag` | Image tag (defaults to chart appVersion) | `""` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Service Parameters

| Name | Description | Default |
|------|-------------|---------|
| `service.type` | Kubernetes Service type | `ClusterIP` |
| `service.port` | Service port | `8102` |

### Ingress Parameters

| Name | Description | Default |
|------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.annotations` | Ingress annotations | See values.yaml |
| `ingress.hosts` | Ingress hosts configuration | `[]` |
| `ingress.tls` | Ingress TLS configuration | `[]` |

### Autoscaling Parameters

| Name | Description | Default |
|------|-------------|---------|
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Minimum replicas | `3` |
| `autoscaling.maxReplicas` | Maximum replicas | `20` |
| `autoscaling.targetCPUUtilizationPercentage` | CPU target | `70` |
| `autoscaling.targetMemoryUtilizationPercentage` | Memory target | `80` |

### Database Parameters

| Name | Description | Default |
|------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL subchart | `true` |
| `postgresql.auth.username` | Database username | `stackauth` |
| `postgresql.auth.database` | Database name | `stackauth` |
| `postgresql.primary.persistence.size` | Database PVC size | `50Gi` |

### Redis Parameters

| Name | Description | Default |
|------|-------------|---------|
| `redis.enabled` | Enable Redis subchart | `true` |
| `redis.architecture` | Redis architecture | `standalone` |
| `redis.master.persistence.size` | Redis PVC size | `10Gi` |

## Examples

### Deploy to AWS EKS

```bash
helm install stack-backend ./kubernetes/helm/stack-backend \
  --namespace production \
  --create-namespace \
  --set image.tag=2.8.39 \
  --set ingress.hosts[0].host=api.example.com \
  --set postgresql.primary.persistence.storageClass=gp3 \
  --set redis.master.persistence.storageClass=gp3 \
  -f values-production.yaml
```

### Deploy to GCP GKE

```bash
helm install stack-backend ./kubernetes/helm/stack-backend \
  --namespace production \
  --create-namespace \
  --set image.tag=2.8.39 \
  --set ingress.className=gce \
  --set postgresql.primary.persistence.storageClass=standard-rwo \
  --set redis.master.persistence.storageClass=standard-rwo
```

### Deploy to Azure AKS

```bash
helm install stack-backend ./kubernetes/helm/stack-backend \
  --namespace production \
  --create-namespace \
  --set image.tag=2.8.39 \
  --set ingress.className=azure-application-gateway \
  --set postgresql.primary.persistence.storageClass=managed-premium \
  --set redis.master.persistence.storageClass=managed-premium
```

## Upgrading

```bash
# Upgrade to a new version
helm upgrade stack-backend ./kubernetes/helm/stack-backend \
  --namespace production \
  -f values-production.yaml

# Upgrade with specific image tag
helm upgrade stack-backend ./kubernetes/helm/stack-backend \
  --namespace production \
  --set image.tag=2.8.40
```

## Uninstalling

```bash
helm uninstall stack-backend --namespace production
```

## Monitoring

The chart includes built-in support for:

- **Prometheus**: ServiceMonitor for metrics collection
- **Grafana**: Compatible with standard Kubernetes dashboards
- **Health Checks**: Liveness, readiness, and startup probes
- **OpenTelemetry**: Distributed tracing support

## Security

### Security Features

- ✅ Non-root container execution
- ✅ Read-only root filesystem
- ✅ Dropped capabilities
- ✅ Network policies
- ✅ Pod disruption budgets
- ✅ Security context configuration

### Best Practices

1. **Use External Secrets**: Don't store secrets in values.yaml
   ```bash
   # Use AWS Secrets Manager
   kubectl create secret generic stack-backend-secrets \
     --from-literal=DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id prod/stackauth/db --query SecretString --output text)"
   ```

2. **Enable Network Policies**: Restrict pod-to-pod communication
   ```yaml
   networkPolicy:
     enabled: true
   ```

3. **Configure TLS**: Use cert-manager for automatic certificate management
   ```yaml
   ingress:
     annotations:
       cert-manager.io/cluster-issuer: "letsencrypt-prod"
   ```

## Troubleshooting

### Common Issues

**Pods not starting**
```bash
kubectl get pods -n production
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production
```

**Database connection issues**
```bash
kubectl exec -it <pod-name> -n production -- pnpm run db:migrate
```

**Ingress not working**
```bash
kubectl get ingress -n production
kubectl describe ingress stack-backend -n production
```

## Support

- Documentation: https://docs.stack-auth.com
- GitHub Issues: https://github.com/stack-auth/stack/issues
- Discord: https://discord.gg/stack-auth

## License

MIT License - see LICENSE file for details
