# 🏢 Guía de Implementación - Opendex Identity Employee para Opendex Corporation

## **Resumen Ejecutivo**

Esta guía proporciona instrucciones completas para implementar **Opendex Identity Employee** personalizado para **Opendex Corporation**, incluyendo configuración corporativa, personalización de branding, y despliegue en producción.

## **📋 Tabla de Contenidos**

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación y Configuración](#instalación-y-configuración)
3. [Personalización Corporativa](#personalización-corporativa)
4. [Configuración de Base de Datos](#configuración-de-base-de-datos)
5. [Configuración de Proveedores OAuth](#configuración-de-proveedores-oauth)
6. [Configuración de Emails](#configuración-de-emails)
7. [Despliegue en Producción](#despliegue-en-producción)
8. [Mantenimiento y Monitoreo](#mantenimiento-y-monitoreo)
9. [Troubleshooting](#troubleshooting)

---

## **🔧 Requisitos Previos**

### **Software Requerido**
- Node.js v20 o superior
- pnpm v9 o superior
- Docker y Docker Compose
- PostgreSQL 14 o superior
- Git

### **Servicios Externos**
- Dominio corporativo (opendex.com)
- Certificados SSL
- Servidor SMTP corporativo
- Proveedores OAuth (Google Workspace, Microsoft 365)

### **Recursos de Red**
- Puerto 3000: Aplicación principal
- Puerto 8101: Dashboard administrativo
- Puerto 8102: API backend
- Puerto 5432: PostgreSQL
- Puerto 6379: Redis (opcional)

---

## **🚀 Instalación y Configuración**

### **Paso 1: Clonar y Configurar el Proyecto**

```bash
# Clonar el repositorio
git clone https://github.com/stack-auth/stack-auth.git
cd stack-auth

# Instalar dependencias
pnpm install

# Construir paquetes
pnpm build:packages

# Generar código
pnpm codegen
```

### **Paso 2: Configurar Variables de Entorno**

```bash
# Copiar archivo de configuración
cp opendex-env-example.txt .env.local

# Editar variables de entorno
nano .env.local
```

**Variables críticas a configurar:**
```env
# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=opendex-corporate
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=tu_clave_publica
STACK_SECRET_SERVER_KEY=tu_clave_secreta

# Base de datos
STACK_DATABASE_CONNECTION_STRING=postgresql://usuario:password@localhost:5432/opendex_corporate

# OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
MICROSOFT_CLIENT_ID=tu_microsoft_client_id
MICROSOFT_CLIENT_SECRET=tu_microsoft_client_secret
```

### **Paso 3: Inicializar Base de Datos**

```bash
# Iniciar dependencias (PostgreSQL, Redis, etc.)
pnpm restart-deps

# Inicializar base de datos
pnpm db:init

# Ejecutar migraciones
pnpm db:migrate

# Sembrar datos iniciales
pnpm db:seed
```

### **Paso 4: Iniciar Servicios de Desarrollo**

```bash
# Iniciar todos los servicios
pnpm dev

# O iniciar servicios básicos (para sistemas con recursos limitados)
pnpm dev:basic
```

**URLs de desarrollo:**
- Aplicación principal: http://localhost:3000
- Dashboard: http://localhost:8101
- API: http://localhost:8102
- Prisma Studio: http://localhost:8106

---

## **🎨 Personalización Corporativa**

### **Paso 1: Aplicar Tema Corporativo**

```typescript
// app/layout.tsx
import { OpendexApp } from './opendex-implementation';

export default function RootLayout({ children }) {
  return (
    <OpendexApp>
      {children}
    </OpendexApp>
  );
}
```

### **Paso 2: Configurar Logos Corporativos**

1. **Subir logos al dashboard:**
   - Acceder a http://localhost:8101
   - Ir a Project Settings → Project Logo
   - Subir logo principal (200x200px)
   - Subir logo completo (mínimo 100px alto)

2. **Configurar logos programáticamente:**
```typescript
// Configurar logos desde código
const stackApp = useStackApp();
await stackApp.admin.updateProject({
  logoUrl: 'https://opendex.com/logo.png',
  fullLogoUrl: 'https://opendex.com/logo-completo.png'
});
```

### **Paso 3: Personalizar Componentes de Autenticación**

```typescript
// pages/auth/signin.tsx
import { OpendexSignInPage } from '../opendex-implementation';

export default function SignInPage() {
  return <OpendexSignInPage />;
}
```

### **Paso 4: Configurar Plantillas de Email**

```typescript
// Configurar plantillas de email corporativas
const emailTemplates = {
  welcome: 'opendex-welcome',
  verification: 'opendex-verification',
  passwordReset: 'opendex-password-reset',
  teamInvitation: 'opendex-team-invitation',
};
```

---

## **🗄️ Configuración de Base de Datos**

### **PostgreSQL Corporativo**

```sql
-- Crear base de datos corporativa
CREATE DATABASE opendex_corporate;

-- Crear usuario corporativo
CREATE USER opendex_user WITH PASSWORD 'opendex_secure_password';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE opendex_corporate TO opendex_user;
```

### **Configuración de Conexión**

```env
# Base de datos de producción
STACK_DATABASE_CONNECTION_STRING=postgresql://opendex_user:password@db.opendex.com:5432/opendex_corporate
STACK_DIRECT_DATABASE_CONNECTION_STRING=postgresql://opendex_user:password@db.opendex.com:5432/opendex_corporate
```

### **Backup Automático**

```bash
# Configurar backup diario
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /usr/local/bin/pg_dump opendex_corporate > /backups/opendex_$(date +\%Y\%m\%d).sql
```

---

## **🔐 Configuración de Proveedores OAuth**

### **Google Workspace**

1. **Crear proyecto en Google Cloud Console**
2. **Configurar OAuth 2.0:**
   - Autorized redirect URIs: `https://api.opendex.com/api/latest/auth/oauth/callback/google`
   - Authorized JavaScript origins: `https://app.opendex.com`

3. **Configurar variables:**
```env
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
```

### **Microsoft 365**

1. **Registrar aplicación en Azure AD**
2. **Configurar redirect URIs:**
   - `https://api.opendex.com/api/latest/auth/oauth/callback/microsoft`

3. **Configurar variables:**
```env
MICROSOFT_CLIENT_ID=tu_microsoft_client_id
MICROSOFT_CLIENT_SECRET=tu_microsoft_client_secret
```

### **SAML SSO (Opcional)**

```env
# Configuración SAML
SAML_ENTITY_ID=https://opendex.com/saml
SAML_SSO_URL=https://saml.opendex.com/sso
SAML_CERTIFICATE=tu_certificado_saml
SAML_PRIVATE_KEY=tu_clave_privada_saml
```

---

## **📧 Configuración de Emails**

### **SMTP Corporativo**

```env
# Configuración SMTP
STACK_EMAIL_SMTP_HOST=smtp.opendex.com
STACK_EMAIL_SMTP_PORT=587
STACK_EMAIL_SMTP_USER=noreply@opendex.com
STACK_EMAIL_SMTP_PASSWORD=tu_password_smtp
STACK_EMAIL_SMTP_SECURE=false

# Configuración de emails
STACK_EMAIL_FROM=noreply@opendex.com
STACK_EMAIL_REPLY_TO=support@opendex.com
```

### **Plantillas de Email Personalizadas**

```typescript
// Configurar plantillas corporativas
const emailConfig = {
  templates: {
    welcome: {
      subject: 'Bienvenido a Opendex Corporation',
      template: 'opendex-welcome',
    },
    verification: {
      subject: 'Verifica tu email - Opendex Corporation',
      template: 'opendex-verification',
    },
    passwordReset: {
      subject: 'Restablecer contraseña - Opendex Corporation',
      template: 'opendex-password-reset',
    },
  },
};
```

---

## **🚀 Despliegue en Producción**

### **Paso 1: Preparar Servidor**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### **Paso 2: Configurar Nginx**

```nginx
# /etc/nginx/sites-available/opendex
server {
    listen 80;
    server_name app.opendex.com dashboard.opendex.com api.opendex.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.opendex.com;
    
    ssl_certificate /etc/ssl/certs/opendex.crt;
    ssl_certificate_key /etc/ssl/private/opendex.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name dashboard.opendex.com;
    
    ssl_certificate /etc/ssl/certs/opendex.crt;
    ssl_certificate_key /etc/ssl/private/opendex.key;
    
    location / {
        proxy_pass http://localhost:8101;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.opendex.com;
    
    ssl_certificate /etc/ssl/certs/opendex.crt;
    ssl_certificate_key /etc/ssl/private/opendex.key;
    
    location / {
        proxy_pass http://localhost:8102;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **Paso 3: Configurar SSL**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificados SSL
sudo certbot --nginx -d app.opendex.com -d dashboard.opendex.com -d api.opendex.com

# Configurar renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Paso 4: Desplegar Aplicación**

```bash
# Construir para producción
pnpm build

# Iniciar servicios de producción
pnpm start

# O usar PM2 para gestión de procesos
npm install -g pm2
pm2 start ecosystem.config.js
```

### **Paso 5: Configurar Monitoreo**

```bash
# Instalar Sentry
npm install @sentry/nextjs

# Configurar Sentry
export SENTRY_DSN=tu_sentry_dsn
export SENTRY_ORG=opendex
export SENTRY_PROJECT=opendex-corporate
```

---

## **📊 Mantenimiento y Monitoreo**

### **Monitoreo de Sistema**

```bash
# Monitoreo de recursos
htop
iotop
nethogs

# Monitoreo de logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Backup Automático**

```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump opendex_corporate > /backups/opendex_$DATE.sql
find /backups -name "opendex_*.sql" -mtime +30 -delete
```

### **Actualizaciones de Seguridad**

```bash
# Actualizar dependencias
pnpm update

# Verificar vulnerabilidades
pnpm audit

# Actualizar sistema
sudo apt update && sudo apt upgrade -y
```

---

## **🔧 Troubleshooting**

### **Problemas Comunes**

#### **Error de Conexión a Base de Datos**
```bash
# Verificar conexión
psql -h localhost -U opendex_user -d opendex_corporate

# Verificar logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

#### **Error de OAuth**
```bash
# Verificar configuración
curl -X GET "https://api.opendex.com/api/latest/oauth-providers"

# Verificar logs
tail -f /var/log/nginx/error.log
```

#### **Error de Email**
```bash
# Probar SMTP
telnet smtp.opendex.com 587

# Verificar logs de email
tail -f /var/log/mail.log
```

### **Comandos de Diagnóstico**

```bash
# Verificar estado de servicios
systemctl status nginx
systemctl status postgresql
systemctl status redis

# Verificar puertos
netstat -tlnp | grep :3000
netstat -tlnp | grep :8101
netstat -tlnp | grep :8102

# Verificar espacio en disco
df -h
du -sh /var/lib/postgresql/
```

---

## **📞 Soporte y Contacto**

### **Recursos de Soporte**
- **Documentación oficial**: https://docs.stack-auth.com
- **GitHub Issues**: https://github.com/stack-auth/stack-auth/issues
- **Discord**: https://discord.stack-auth.com

### **Contacto Corporativo**
- **Email**: support@opendex.com
- **Teléfono**: +1 (555) 123-4567
- **Horario**: Lunes a Viernes, 9:00 AM - 6:00 PM EST

---

## **✅ Checklist de Implementación**

### **Pre-Despliegue**
- [ ] Variables de entorno configuradas
- [ ] Base de datos inicializada
- [ ] Proveedores OAuth configurados
- [ ] SMTP configurado
- [ ] Logos corporativos subidos
- [ ] Plantillas de email personalizadas
- [ ] SSL configurado
- [ ] Nginx configurado

### **Post-Despliegue**
- [ ] Aplicación accesible
- [ ] Dashboard funcionando
- [ ] API respondiendo
- [ ] Autenticación OAuth funcionando
- [ ] Emails enviándose
- [ ] Backup automático configurado
- [ ] Monitoreo configurado
- [ ] Logs funcionando

### **Seguridad**
- [ ] Firewall configurado
- [ ] Certificados SSL válidos
- [ ] Contraseñas seguras
- [ ] MFA habilitado
- [ ] Rate limiting configurado
- [ ] Logs de auditoría habilitados

---

**🎉 ¡Felicidades! Has implementado exitosamente Opendex Identity Employee para Opendex Corporation.**

Para soporte adicional o preguntas específicas, contacta al equipo de desarrollo en support@opendex.com.
