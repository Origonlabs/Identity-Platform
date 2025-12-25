#!/bin/bash

# Script para actualizar imports después de reorganizar
# Ejecutar después de reorganize-structure.sh

set -e

cd "$(dirname "$0")/.."

echo "Actualizando imports..."

# Función para actualizar imports en un archivo
update_imports() {
  local file=$1
  
  # Actualizar imports de security
  sed -i 's|@opendex/security|@opendex/security/security|g' "$file"
  sed -i 's|@opendex/zero-trust|@opendex/security/zero-trust|g' "$file"
  sed -i 's|@opendex/threat-intelligence|@opendex/security/threat-intelligence|g' "$file"
  sed -i 's|@opendex/encryption|@opendex/security/encryption|g' "$file"
  sed -i 's|@opendex/quantum-resistant|@opendex/security/quantum-resistant|g' "$file"
  sed -i 's|@opendex/behavioral-biometrics|@opendex/security/behavioral-biometrics|g' "$file"
  sed -i 's|@opendex/continuous-auth|@opendex/security/continuous-auth|g' "$file"
  sed -i 's|@opendex/ml-auth|@opendex/security/ml-auth|g' "$file"
  
  # Actualizar imports de identity
  sed -i 's|@opendex/decentralized-identity|@opendex/identity/decentralized-identity|g' "$file"
  sed -i 's|@opendex/zero-knowledge|@opendex/identity/zero-knowledge|g' "$file"
  sed -i 's|@opendex/session-management|@opendex/identity/session-management|g' "$file"
  sed -i 's|@opendex/rbac-advanced|@opendex/identity/rbac-advanced|g' "$file"
  
  # Actualizar imports de infrastructure
  sed -i 's|@opendex/event-bus|@opendex/infrastructure/event-bus|g' "$file"
  sed -i 's|@opendex/service-client|@opendex/infrastructure/service-client|g' "$file"
  sed -i 's|@opendex/cache|@opendex/infrastructure/cache|g' "$file"
  sed -i 's|@opendex/rate-limiting|@opendex/infrastructure/rate-limiting|g' "$file"
  sed -i 's|@opendex/ml-rate-limiting|@opendex/infrastructure/ml-rate-limiting|g' "$file"
  sed -i 's|@opendex/ddos-protection|@opendex/infrastructure/ddos-protection|g' "$file"
  
  # Actualizar imports de observability
  sed -i 's|@opendex/observability|@opendex/observability/observability|g' "$file"
  sed -i 's|@opendex/analytics|@opendex/observability/analytics|g' "$file"
  sed -i 's|@opendex/anomaly-detection|@opendex/observability/anomaly-detection|g' "$file"
  
  # Actualizar imports de compliance
  sed -i 's|@opendex/compliance|@opendex/compliance/compliance|g' "$file"
  sed -i 's|@opendex/blockchain-audit|@opendex/compliance/blockchain-audit|g' "$file"
  sed -i 's|@opendex/webhooks|@opendex/compliance/webhooks|g' "$file"
  
  # Actualizar imports de advanced
  sed -i 's|@opendex/homomorphic-encryption|@opendex/advanced/homomorphic-encryption|g' "$file"
  sed -i 's|@opendex/federated-learning|@opendex/advanced/federated-learning|g' "$file"
  sed -i 's|@opendex/graphql-api|@opendex/advanced/graphql-api|g' "$file"
  
  # Actualizar imports de performance
  sed -i 's|@opendex/performance|@opendex/performance/performance|g' "$file"
  sed -i 's|@opendex/multi-region|@opendex/performance/multi-region|g' "$file"
  sed -i 's|@opendex/self-healing|@opendex/performance/self-healing|g' "$file"
  
  # Actualizar imports de core
  sed -i 's|@opendex/contracts|@opendex/core/contracts|g' "$file"
}

# Encontrar y actualizar todos los archivos TypeScript
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" | while read file; do
  update_imports "$file"
done

echo "Imports actualizados."
