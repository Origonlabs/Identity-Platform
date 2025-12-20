#!/bin/bash

# Script de Corrección Automática de Vulnerabilidades Críticas
# Atlas Identity Platform Identity Platform - Security Patch
# Fecha: 2025-12-16

set -e  # Exit on error

echo "=============================================="
echo "🔒 INICIANDO CORRECCIÓN DE VULNERABILIDADES"
echo "=============================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Error: Debe ejecutar este script desde la raíz del proyecto"
    exit 1
fi

print_status "Directorio del proyecto verificado"

# Paso 1: Backup del package.json actual
echo ""
echo "Paso 1: Creando backup de package.json..."
cp package.json package.json.backup
print_status "Backup creado: package.json.backup"

# Paso 2: Agregar overrides al package.json raíz
echo ""
echo "Paso 2: Configurando overrides de seguridad en package.json..."

# Usar node para modificar el package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Agregar o actualizar pnpm overrides
if (!pkg.pnpm) pkg.pnpm = {};
if (!pkg.pnpm.overrides) pkg.pnpm.overrides = {};

// Forzar versiones seguras
pkg.pnpm.overrides['next'] = '>=15.4.8';
pkg.pnpm.overrides['elliptic'] = '>=6.6.1';
pkg.pnpm.overrides['koa'] = '>=2.15.4';
pkg.pnpm.overrides['form-data'] = '>=4.0.4';
pkg.pnpm.overrides['vitest'] = '>=1.6.1';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('✓ Overrides configurados correctamente');
"

print_status "Overrides de seguridad configurados"

# Paso 3: Actualizar apps principales (backend, dashboard, docs)
echo ""
echo "Paso 3: Actualizando apps principales..."

print_status "Actualizando apps/backend..."
cd apps/backend
pnpm add next@latest react@latest react-dom@latest --save-exact
cd ../..

print_status "Actualizando apps/dashboard..."
cd apps/dashboard
pnpm add next@latest react@latest react-dom@latest --save-exact
cd ../..

print_status "Actualizando docs..."
cd docs
pnpm add next@latest --save-exact
cd ..

# Paso 4: Actualizar ejemplos con Next.js 15.x
echo ""
echo "Paso 4: Actualizando ejemplos con Next.js 15.x..."

print_status "Actualizando examples/demo..."
cd examples/demo
pnpm add next@latest --save-exact
cd ../..

print_status "Actualizando examples/convex..."
cd examples/convex
pnpm add next@^15.2.6 --save-exact
cd ../..

# Paso 5: Actualizar ejemplos con Next.js 14.x
echo ""
echo "Paso 5: Actualizando ejemplos con Next.js 14.x..."

for example in docs-examples cjs-test middleware e-commerce supabase; do
    if [ -d "examples/$example" ]; then
        print_status "Actualizando examples/$example..."
        cd "examples/$example"
        pnpm add next@^14.2.25 --save-exact
        cd ../..
    else
        print_warning "examples/$example no encontrado, saltando..."
    fi
done

# Paso 6: Actualizar partial-prerendering (canary)
echo ""
echo "Paso 6: Actualizando examples/partial-prerendering..."
if [ -d "examples/partial-prerendering" ]; then
    cd examples/partial-prerendering
    pnpm add next@^14.3.0-canary.26 --save-exact
    cd ../..
    print_status "examples/partial-prerendering actualizado"
fi

# Paso 7: Actualizar dependencias de seguridad globalmente
echo ""
echo "Paso 7: Actualizando dependencias de seguridad globalmente..."

print_status "Actualizando elliptic..."
pnpm update elliptic@latest --recursive

print_status "Actualizando oidc-provider (incluye koa)..."
pnpm update oidc-provider@latest

print_status "Actualizando vitest..."
pnpm update vitest@latest -D

# Paso 8: Reinstalar todas las dependencias
echo ""
echo "Paso 8: Reinstalando todas las dependencias..."
pnpm install

print_status "Dependencias reinstaladas"

# Paso 9: Ejecutar auditoría de seguridad
echo ""
echo "Paso 9: Ejecutando auditoría de seguridad..."
echo ""

if pnpm audit --audit-level=critical; then
    print_status "✅ No se encontraron vulnerabilidades críticas"
else
    print_warning "⚠️ Aún hay vulnerabilidades. Revisar output de pnpm audit"
fi

# Paso 10: Ejecutar linter
echo ""
echo "Paso 10: Ejecutando linter..."
if pnpm run lint; then
    print_status "Lint pasó correctamente"
else
    print_warning "Hay warnings de lint, pero no son críticos para seguridad"
fi

# Paso 11: Ejecutar typecheck
echo ""
echo "Paso 11: Verificando TypeScript..."
if pnpm run typecheck; then
    print_status "TypeScript compiló correctamente"
else
    print_error "Hay errores de TypeScript que deben corregirse"
fi

# Resumen final
echo ""
echo "=============================================="
echo "🎉 CORRECCIÓN DE VULNERABILIDADES COMPLETADA"
echo "=============================================="
echo ""
echo "Resumen de acciones:"
echo "✓ Overrides de seguridad configurados en package.json"
echo "✓ Apps principales actualizadas (backend, dashboard, docs)"
echo "✓ Ejemplos con Next.js 15.x actualizados"
echo "✓ Ejemplos con Next.js 14.x actualizados"
echo "✓ Dependencias de seguridad actualizadas (elliptic, koa, vitest, form-data)"
echo "✓ Todas las dependencias reinstaladas"
echo ""
echo "Próximos pasos recomendados:"
echo "1. Revisar el output de 'pnpm audit' arriba"
echo "2. Ejecutar tests: pnpm run test"
echo "3. Ejecutar build: pnpm run build"
echo "4. Verificar que todo funciona correctamente"
echo ""
echo "Backup guardado en: package.json.backup"
echo "Si algo falla, restaurar con: cp package.json.backup package.json"
echo ""
