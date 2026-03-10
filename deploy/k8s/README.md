# Paperclip Kubernetes Deploy

This directory provides production-oriented Kubernetes templates with Kustomize overlays.

## Structure

- `base/`: baseline deployment, service, hpa, configmap, namespace
- `monitoring/`: `ServiceMonitor` + `PrometheusRule`
- `canary/`: Argo Rollouts resources (`Rollout`, canary/stable services, analysis template)
- `overlays/staging/`: staging deployment profile
- `overlays/production/`: production deployment profile
- `overlays/canary/`: canary rollout profile

## Prerequisites

- Kubernetes cluster
- Metrics stack (Prometheus Operator) for `monitoring.coreos.com` CRDs
- Argo Rollouts CRDs/controllers for canary rollout resources
- Secret `paperclip-secrets` in target namespace with keys:
  - `database-url`
  - `better-auth-secret`
- Optional secret `paperclip-metrics` with key `token` (if using bearer-protected metrics scrape)

## Deploy with Kustomize

Staging:

```sh
kubectl apply -k deploy/k8s/overlays/staging
```

Production:

```sh
kubectl apply -k deploy/k8s/overlays/production
```

Canary rollout:

```sh
kubectl apply -k deploy/k8s/overlays/canary
```

## GitHub Actions templates

- `.github/workflows/deploy-kustomize-template.yml`
- `.github/workflows/deploy-canary-template.yml`

Both workflows now support:

- `image_repository` (optional): defaults to `ghcr.io/<owner>/<repo>` from current repository
- `image_tag` (required): image tag to deploy
- `namespace` (optional): namespace override for rendered manifests
- `kube_context` (optional): target kubeconfig context
- `rollout_name` (canary workflow): Argo Rollout resource name override

Example dispatch choices:

- staging deploy: `environment=staging`, `image_tag=main-<sha>`
- production deploy: `environment=production`, `namespace=paperclip`
- canary deploy: `image_tag=canary-<sha>`, `rollout_name=paperclip`

## Rollback

Deployment rollback:

```sh
kubectl rollout undo deployment/paperclip -n paperclip
```

Argo Rollout rollback:

```sh
kubectl argo rollouts undo paperclip -n paperclip
kubectl argo rollouts promote paperclip -n paperclip --full
```

## Metrics auth modes

- `PAPERCLIP_METRICS_ALLOW_ANONYMOUS=true`: allow internal scrape without auth
- `PAPERCLIP_METRICS_BEARER_TOKEN=<token>`: require bearer token for `/api/metrics`
- Otherwise in `authenticated` mode, board auth is required for `/api/metrics`
