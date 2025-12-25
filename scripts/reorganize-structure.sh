#!/bin/bash

# Script para reorganizar la estructura de paquetes
# Ejecutar con: bash scripts/reorganize-structure.sh

set -e

cd "$(dirname "$0")/.."

echo "Reorganizando estructura de paquetes..."

# Crear estructura de directorios
mkdir -p packages/core
mkdir -p packages/security
mkdir -p packages/identity
mkdir -p packages/infrastructure
mkdir -p packages/observability
mkdir -p packages/compliance
mkdir -p packages/advanced
mkdir -p packages/performance

# Mover paquetes core
if [ -d "packages/contracts" ]; then
  mv packages/contracts packages/core/contracts
fi

# Mover paquetes de seguridad
for pkg in security zero-trust threat-intelligence encryption quantum-resistant behavioral-biometrics continuous-auth ml-auth; do
  if [ -d "packages/$pkg" ]; then
    mv "packages/$pkg" "packages/security/$pkg"
  fi
done

# Mover paquetes de identidad
for pkg in decentralized-identity zero-knowledge session-management rbac-advanced; do
  if [ -d "packages/$pkg" ]; then
    mv "packages/$pkg" "packages/identity/$pkg"
  fi
done

# Mover paquetes de infraestructura
for pkg in event-bus service-client cache rate-limiting ml-rate-limiting ddos-protection; do
  if [ -d "packages/$pkg" ]; then
    mv "packages/$pkg" "packages/infrastructure/$pkg"
  fi
done

# Mover paquetes de observabilidad
for pkg in observability analytics anomaly-detection; do
  if [ -d "packages/$pkg" ]; then
    mv "packages/$pkg" "packages/observability/$pkg"
  fi
done

# Mover paquetes de compliance
for pkg in compliance blockchain-audit webhooks; do
  if [ -d "packages/$pkg" ]; then
    mv "packages/$pkg" "packages/compliance/$pkg"
  fi
done

# Mover paquetes avanzados
for pkg in homomorphic-encryption federated-learning graphql-api; do
  if [ -d "packages/$pkg" ]; then
    mv "packages/$pkg" "packages/advanced/$pkg"
  fi
done

# Mover paquetes de performance
for pkg in performance multi-region self-healing; do
  if [ -d "packages/$pkg" ]; then
    mv "packages/$pkg" "packages/performance/$pkg"
  fi
done

echo "Estructura reorganizada. Actualiza pnpm-workspace.yaml manualmente."
