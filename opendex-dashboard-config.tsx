/**
 * Configuración del dashboard corporativo para Opendex Corporation
 * Personaliza la interfaz administrativa con la identidad visual de Opendex Identity Employee
 */

import React from 'react';

// Metadatos corporativos para el dashboard
export const opendexDashboardMetadata = {
  title: {
    default: 'Opendex Corporation - Dashboard',
    template: '%s | Opendex Corporation',
  },
  description: 'Panel de administración corporativo de Opendex Corporation - Gestión de usuarios, equipos y Opendex Identity Employee',
  keywords: 'Opendex, Corporation, Dashboard, Administración, Opendex Identity Employee, Gestión de usuarios',
  authors: [{ name: 'Opendex Corporation' }],
  creator: 'Opendex Corporation',
  publisher: 'Opendex Corporation',
  openGraph: {
    title: 'Opendex Corporation - Dashboard',
    description: 'Panel de administración corporativo de Opendex Corporation',
    url: 'https://dashboard.opendex.com',
    siteName: 'Opendex Corporation',
    images: [
      {
        url: 'https://opendex.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Opendex Corporation Dashboard',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opendex Corporation - Dashboard',
    description: 'Panel de administración corporativo de Opendex Corporation',
    images: ['https://opendex.com/og-image.png'],
    creator: '@opendex',
  },
  robots: {
    index: false, // Dashboard privado
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

// Configuración de navegación corporativa
export const opendexNavigationConfig = {
  brand: {
    logo: '/opendex-logo.png',
    name: 'Opendex Corporation',
    href: '/dashboard',
  },
  mainNav: [
    {
      title: 'Inicio',
      href: '/dashboard',
      icon: 'Home',
    },
    {
      title: 'Usuarios',
      href: '/dashboard/users',
      icon: 'Users',
    },
    {
      title: 'Equipos',
      href: '/dashboard/teams',
      icon: 'Building',
    },
    {
      title: 'Opendex Identity Employee',
      href: '/dashboard/auth',
      icon: 'Shield',
    },
    {
      title: 'Configuración',
      href: '/dashboard/settings',
      icon: 'Settings',
    },
  ],
  userNav: [
    {
      title: 'Perfil',
      href: '/dashboard/profile',
      icon: 'User',
    },
    {
      title: 'Configuración',
      href: '/dashboard/settings',
      icon: 'Settings',
    },
    {
      title: 'Soporte',
      href: '/dashboard/support',
      icon: 'HelpCircle',
    },
  ],
};

// Configuración de roles y permisos corporativos
export const opendexRolesConfig = {
  roles: [
    {
      id: 'super-admin',
      name: 'Super Administrador',
      description: 'Acceso completo al sistema corporativo',
      permissions: [
        'users:read',
        'users:write',
        'users:delete',
        'teams:read',
        'teams:write',
        'teams:delete',
        'auth:read',
        'auth:write',
        'settings:read',
        'settings:write',
        'analytics:read',
        'logs:read',
      ],
      color: '#D32F2F',
    },
    {
      id: 'admin',
      name: 'Administrador',
      description: 'Administración de usuarios y equipos',
      permissions: [
        'users:read',
        'users:write',
        'teams:read',
        'teams:write',
        'auth:read',
        'analytics:read',
      ],
      color: '#F57C00',
    },
    {
      id: 'manager',
      name: 'Gerente',
      description: 'Gestión de equipos y usuarios asignados',
      permissions: [
        'users:read',
        'teams:read',
        'teams:write',
        'analytics:read',
      ],
      color: '#1976D2',
    },
    {
      id: 'user',
      name: 'Usuario',
      description: 'Acceso básico a la plataforma',
      permissions: [
        'profile:read',
        'profile:write',
      ],
      color: '#388E3C',
    },
  ],
  permissions: [
    {
      id: 'users:read',
      name: 'Leer usuarios',
      description: 'Ver información de usuarios',
    },
    {
      id: 'users:write',
      name: 'Escribir usuarios',
      description: 'Crear y modificar usuarios',
    },
    {
      id: 'users:delete',
      name: 'Eliminar usuarios',
      description: 'Eliminar usuarios del sistema',
    },
    {
      id: 'teams:read',
      name: 'Leer equipos',
      description: 'Ver información de equipos',
    },
    {
      id: 'teams:write',
      name: 'Escribir equipos',
      description: 'Crear y modificar equipos',
    },
    {
      id: 'teams:delete',
      name: 'Eliminar equipos',
      description: 'Eliminar equipos del sistema',
    },
    {
      id: 'auth:read',
      name: 'Leer Opendex Identity Employee',
      description: 'Ver configuración de Opendex Identity Employee',
    },
    {
      id: 'auth:write',
      name: 'Escribir Opendex Identity Employee',
      description: 'Modificar configuración de Opendex Identity Employee',
    },
    {
      id: 'settings:read',
      name: 'Leer configuración',
      description: 'Ver configuración del sistema',
    },
    {
      id: 'settings:write',
      name: 'Escribir configuración',
      description: 'Modificar configuración del sistema',
    },
    {
      id: 'analytics:read',
      name: 'Leer analíticas',
      description: 'Ver reportes y estadísticas',
    },
    {
      id: 'logs:read',
      name: 'Leer logs',
      description: 'Ver logs del sistema',
    },
    {
      id: 'profile:read',
      name: 'Leer perfil',
      description: 'Ver perfil propio',
    },
    {
      id: 'profile:write',
      name: 'Escribir perfil',
      description: 'Modificar perfil propio',
    },
  ],
};

// Configuración de equipos corporativos
export const opendexTeamsConfig = {
  defaultTeams: [
    {
      id: 'executive',
      name: 'Ejecutivo',
      description: 'Equipo ejecutivo de Opendex Corporation',
      color: '#D32F2F',
      permissions: ['all'],
    },
    {
      id: 'engineering',
      name: 'Ingeniería',
      description: 'Equipo de desarrollo e ingeniería',
      color: '#1976D2',
      permissions: ['users:read', 'teams:read', 'analytics:read'],
    },
    {
      id: 'marketing',
      name: 'Marketing',
      description: 'Equipo de marketing y comunicaciones',
      color: '#7B1FA2',
      permissions: ['users:read', 'analytics:read'],
    },
    {
      id: 'sales',
      name: 'Ventas',
      description: 'Equipo de ventas y desarrollo comercial',
      color: '#F57C00',
      permissions: ['users:read', 'analytics:read'],
    },
    {
      id: 'support',
      name: 'Soporte',
      description: 'Equipo de soporte al cliente',
      color: '#388E3C',
      permissions: ['users:read', 'users:write'],
    },
    {
      id: 'hr',
      name: 'Recursos Humanos',
      description: 'Equipo de recursos humanos',
      color: '#5D4037',
      permissions: ['users:read', 'users:write', 'teams:read'],
    },
  ],
};

// Configuración de autenticación corporativa
export const opendexAuthConfig = {
  providers: [
    {
      id: 'google',
      name: 'Google Workspace',
      enabled: true,
      description: 'Autenticación con Google Workspace corporativo para Opendex Identity Employee',
      icon: 'Google',
      color: '#4285F4',
    },
    {
      id: 'microsoft',
      name: 'Microsoft 365',
      enabled: true,
      description: 'Autenticación con Microsoft 365 corporativo para Opendex Identity Employee',
      icon: 'Microsoft',
      color: '#2F2F2F',
    },
    {
      id: 'saml',
      name: 'SAML SSO',
      enabled: true,
      description: 'Autenticación SAML corporativa para Opendex Identity Employee',
      icon: 'Shield',
      color: '#0066CC',
    },
    {
      id: 'ldap',
      name: 'LDAP/Active Directory',
      enabled: true,
      description: 'Autenticación con Active Directory para Opendex Identity Employee',
      icon: 'Database',
      color: '#0F9D58',
    },
  ],
  security: {
    mfaRequired: true,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      preventReuse: 5,
      maxAge: 90, // días
    },
    sessionTimeout: 8, // horas
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutos
  },
};

// Configuración de notificaciones corporativas
export const opendexNotificationsConfig = {
  email: {
    enabled: true,
    from: 'noreply@opendex.com',
    replyTo: 'support@opendex.com',
    templates: {
      welcome: 'opendex-welcome',
      verification: 'opendex-verification',
      passwordReset: 'opendex-password-reset',
      teamInvitation: 'opendex-team-invitation',
    },
  },
  webhooks: {
    enabled: true,
    events: [
      'user.created',
      'user.updated',
      'user.deleted',
      'team.created',
      'team.updated',
      'team.deleted',
      'auth.login',
      'auth.logout',
      'auth.failed',
    ],
  },
  alerts: {
    enabled: true,
    channels: ['email', 'slack', 'webhook'],
    events: [
      'security.breach',
      'user.lockout',
      'system.error',
      'auth.failure',
    ],
  },
};

// Configuración de analytics corporativos
export const opendexAnalyticsConfig = {
  enabled: true,
  retention: 365, // días
  metrics: [
    'user.login.count',
    'user.registration.count',
    'team.activity.count',
    'auth.provider.usage',
    'security.events.count',
    'system.performance',
  ],
  dashboards: [
    {
      id: 'overview',
      name: 'Resumen General',
      description: 'Métricas principales del sistema',
    },
    {
      id: 'users',
      name: 'Usuarios',
      description: 'Estadísticas de usuarios y actividad',
    },
    {
      id: 'security',
      name: 'Seguridad',
      description: 'Eventos de seguridad y autenticación',
    },
    {
      id: 'teams',
      name: 'Equipos',
      description: 'Actividad y gestión de equipos',
    },
  ],
};

// Componente de header corporativo
export function OpendexDashboardHeader() {
  return (
    <header className="opendex-dashboard-header">
      <div className="opendex-header-content">
        <div className="opendex-brand">
          <img 
            src="/opendex-logo.png" 
            alt="Opendex Corporation" 
            className="opendex-logo"
          />
          <div className="opendex-brand-text">
            <h1>Opendex Corporation</h1>
            <span>Dashboard Corporativo</span>
          </div>
        </div>
        
        <nav className="opendex-nav">
          {opendexNavigationConfig.mainNav.map((item) => (
            <a 
              key={item.id}
              href={item.href}
              className="opendex-nav-item"
            >
              <span className="opendex-nav-icon">{item.icon}</span>
              <span className="opendex-nav-text">{item.title}</span>
            </a>
          ))}
        </nav>
        
        <div className="opendex-user-menu">
          <div className="opendex-user-info">
            <span className="opendex-user-name">Usuario Corporativo</span>
            <span className="opendex-user-role">Administrador</span>
          </div>
          <div className="opendex-user-avatar">
            <img src="/default-avatar.png" alt="Avatar" />
          </div>
        </div>
      </div>
    </header>
  );
}

// Estilos CSS para el dashboard corporativo
export const opendexDashboardStyles = `
  .opendex-dashboard-header {
    background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
    color: white;
    padding: 1rem 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .opendex-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .opendex-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .opendex-logo {
    height: 40px;
    width: auto;
  }
  
  .opendex-brand-text h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: white;
  }
  
  .opendex-brand-text span {
    font-size: 0.875rem;
    color: #E6F2FF;
  }
  
  .opendex-nav {
    display: flex;
    gap: 2rem;
  }
  
  .opendex-nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    transition: background-color 0.2s ease;
  }
  
  .opendex-nav-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .opendex-user-menu {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .opendex-user-info {
    text-align: right;
  }
  
  .opendex-user-name {
    display: block;
    font-weight: 500;
    color: white;
  }
  
  .opendex-user-role {
    display: block;
    font-size: 0.875rem;
    color: #E6F2FF;
  }
  
  .opendex-user-avatar img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 768px) {
    .opendex-header-content {
      flex-direction: column;
      gap: 1rem;
    }
    
    .opendex-nav {
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .opendex-user-menu {
      order: -1;
    }
  }
`;
