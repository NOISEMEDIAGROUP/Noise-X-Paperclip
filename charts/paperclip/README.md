# Paperclip Helm Chart

Deploy [Paperclip](https://github.com/paperclipai/paperclip) on Kubernetes.

## Quick Start

```bash
# Add the Bitnami repo (needed only if using the PostgreSQL subchart)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Install with an external database
helm install paperclip ./charts/paperclip \
  --set externalDatabase.host=my-pg.example.com \
  --set externalDatabase.password=secret \
  --set secrets.betterAuthSecret=$(openssl rand -hex 32)

# Or with the bundled PostgreSQL subchart (dev/staging only)
helm install paperclip ./charts/paperclip \
  --set postgresql.enabled=true \
  --set secrets.betterAuthSecret=$(openssl rand -hex 32)
```

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Container image | `ghcr.io/paperclipai/paperclip` |
| `image.tag` | Image tag | `Chart.appVersion` |
| `paperclip.port` | Server port | `3100` |
| `paperclip.deploymentMode` | `local_trusted` or `authenticated` | `authenticated` |
| `paperclip.storage.provider` | `local_disk` or `s3` | `local_disk` |
| `secrets.betterAuthSecret` | Auth secret (required) | `""` |
| `secrets.existingSecret` | Use pre-existing K8s Secret | `""` |
| `externalDatabase.host` | External PostgreSQL host | `""` |
| `postgresql.enabled` | Deploy Bitnami PostgreSQL | `false` |
| `persistence.enabled` | Create a PVC for `/paperclip` | `true` |
| `persistence.size` | PVC size | `10Gi` |
| `ingress.enabled` | Enable Ingress | `false` |
| `autoscaling.enabled` | Enable HPA | `false` |
| `networkPolicy.enabled` | Enable NetworkPolicy | `false` |

See [`values.yaml`](values.yaml) for the full list.

## Examples

### S3 storage with ingress

```yaml
paperclip:
  storage:
    provider: s3
    s3:
      bucket: my-paperclip-bucket
      region: us-west-2

ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
  hosts:
    - host: paperclip.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: paperclip-tls
      hosts:
        - paperclip.example.com
```

### Using an existing secret

```yaml
secrets:
  create: false
  existingSecret: my-paperclip-secrets
```

The existing secret must contain: `DATABASE_URL`, `BETTER_AUTH_SECRET`, and any other required keys.

## Database Migrations

Migrations run automatically on startup (`PAPERCLIP_MIGRATION_AUTO_APPLY=true`). The startup probe allows up to 150 seconds for migrations to complete before the pod is considered failed.

## WebSocket Support

Paperclip uses WebSockets for real-time updates. When using nginx ingress, add the timeout annotations shown in the S3 example above.
