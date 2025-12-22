/**
 * Implementación principal de Opendex Identity Employee para Opendex Corporation
 * Integra todos los componentes corporativos personalizados
 */

import { StackApp, StackProvider } from '@opendex/stack';
import React from 'react';
import {
    OpendexAuthPage,
    opendexAuthStyles,
    OpendexFullAuthPage
} from './opendex-auth-components';
import {
    OpendexDashboardHeader,
    opendexDashboardMetadata,
    opendexDashboardStyles
} from './opendex-dashboard-config';
import { OpendexLayout } from './opendex-layout';
import { opendexTheme } from './opendex-theme';

// Configuración de la aplicación Opendex Identity Employee para Opendex
const opendexStackConfig = {
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID || 'opendex-corporate',
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY || 'opendex-publishable-key',
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY || 'opendex-secret-key',
  apiUrl: process.env.NEXT_PUBLIC_STACK_API_URL || 'https://api.opendex.com',
  urls: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    accountSettings: '/auth/account',
    afterSignIn: '/dashboard',
    afterSignUp: '/dashboard/onboarding',
  },
  theme: opendexTheme,
};

// Componente principal de la aplicación Opendex
export function OpendexApp({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider config={opendexStackConfig}>
      <OpendexLayout>
        <style jsx global>{opendexAuthStyles}</style>
        <style jsx global>{opendexDashboardStyles}</style>
        {children}
      </OpendexLayout>
    </StackProvider>
  );
}

// Páginas de autenticación específicas para Opendex
export function OpendexSignInPage() {
  return (
    <OpendexApp>
      <OpendexFullAuthPage type="sign-in" />
    </OpendexApp>
  );
}

export function OpendexSignUpPage() {
  return (
    <OpendexApp>
      <OpendexFullAuthPage type="sign-up" />
    </OpendexApp>
  );
}

// Dashboard corporativo de Opendex
export function OpendexDashboard({ children }: { children: React.ReactNode }) {
  return (
    <OpendexApp>
      <div className="opendex-dashboard">
        <OpendexDashboardHeader />
        <main className="opendex-dashboard-main">
          {children}
        </main>
      </div>
    </OpendexApp>
  );
}

// Componente de configuración de proyecto Opendex
export function OpendexProjectConfig() {
  return {
    // Configuración del proyecto
    displayName: 'Opendex Corporation',
    description: 'Sistema de autenticación corporativo de Opendex Corporation',
    isProductionMode: process.env.NODE_ENV === 'production',
    
    // Configuración de autenticación
    auth: {
      credentialEnabled: true,
      magicLinkEnabled: true,
      passkeyEnabled: true,
      signUpEnabled: true,
      emailVerificationRequired: true,
      passwordResetEnabled: true,
    },
    
    // Proveedores OAuth corporativos
    oauthProviders: [
      {
        id: 'google',
        enabled: true,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scopes: ['openid', 'email', 'profile'],
      },
      {
        id: 'microsoft',
        enabled: true,
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        scopes: ['openid', 'email', 'profile'],
      },
      {
        id: 'github',
        enabled: true,
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        scopes: ['user:email'],
      },
    ],
    
    // Configuración de equipos
    teams: {
      enabled: true,
      allowMultipleTeams: true,
      requireTeamApproval: true,
      defaultTeamRole: 'member',
    },
    
    // Configuración de permisos
    permissions: {
      enabled: true,
      defaultPermissions: ['profile:read', 'profile:write'],
    },
    
    // Configuración de emails
    emails: {
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
    
    // Configuración de webhooks
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
      ],
    },
    
    // Configuración de seguridad
    security: {
      mfaRequired: true,
      sessionTimeout: 8, // horas
      maxLoginAttempts: 5,
      lockoutDuration: 30, // minutos
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        preventReuse: 5,
        maxAge: 90, // días
      },
    },
  };
}

// Hook personalizado para usar Opendex Identity Employee en Opendex
export function useOpendexStack() {
  const stackApp = StackApp.use();
  
  return {
    ...stackApp,
    // Métodos personalizados para Opendex
    opendex: {
      // Crear usuario corporativo
      createCorporateUser: async (userData: {
        email: string;
        displayName: string;
        teamId?: string;
        role?: string;
      }) => {
        return await stackApp.admin.createUser({
          ...userData,
          emailVerified: true,
          projectId: 'opendex-corporate',
        });
      },
      
      // Crear equipo corporativo
      createCorporateTeam: async (teamData: {
        displayName: string;
        description: string;
        ownerId: string;
      }) => {
        return await stackApp.admin.createTeam({
          ...teamData,
          projectId: 'opendex-corporate',
        });
      },
      
      // Enviar invitación corporativa
      sendCorporateInvitation: async (invitationData: {
        email: string;
        teamId: string;
        role: string;
        inviterId: string;
      }) => {
        return await stackApp.admin.sendTeamInvitation({
          ...invitationData,
          projectId: 'opendex-corporate',
        });
      },
      
      // Obtener estadísticas corporativas
      getCorporateStats: async () => {
        const users = await stackApp.admin.listUsers();
        const teams = await stackApp.admin.listTeams();
        
        return {
          totalUsers: users.length,
          totalTeams: teams.length,
          activeUsers: users.filter(u => u.lastSignInAt).length,
          newUsersThisMonth: users.filter(u => {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return new Date(u.createdAt) > monthAgo;
          }).length,
        };
      },
    },
  };
}

// Componente de página de inicio corporativa
export function OpendexHomePage() {
  const { opendex } = useOpendexStack();
  const [stats, setStats] = React.useState(null);
  
  React.useEffect(() => {
    opendex.getCorporateStats().then(setStats);
  }, []);
  
  return (
    <OpendexDashboard>
      <div className="opendex-home-page">
        <div className="opendex-welcome-section">
          <h1>Bienvenido a Opendex Corporation</h1>
          <p>Opendex Identity Employee - Sistema de gestión de identidad de empleados</p>
        </div>
        
        {stats && (
          <div className="opendex-stats-grid">
            <div className="opendex-stat-card">
              <h3>Usuarios Totales</h3>
              <p className="opendex-stat-number">{stats.totalUsers}</p>
            </div>
            <div className="opendex-stat-card">
              <h3>Equipos</h3>
              <p className="opendex-stat-number">{stats.totalTeams}</p>
            </div>
            <div className="opendex-stat-card">
              <h3>Usuarios Activos</h3>
              <p className="opendex-stat-number">{stats.activeUsers}</p>
            </div>
            <div className="opendex-stat-card">
              <h3>Nuevos este Mes</h3>
              <p className="opendex-stat-number">{stats.newUsersThisMonth}</p>
            </div>
          </div>
        )}
        
        <div className="opendex-quick-actions">
          <h2>Acciones Rápidas</h2>
          <div className="opendex-action-buttons">
            <button className="opendex-action-button">
              <span>👥</span>
              Gestionar Usuarios
            </button>
            <button className="opendex-action-button">
              <span>🏢</span>
              Gestionar Equipos
            </button>
            <button className="opendex-action-button">
              <span>🔐</span>
              Configurar Opendex Identity Employee
            </button>
            <button className="opendex-action-button">
              <span>📊</span>
              Ver Reportes
            </button>
          </div>
        </div>
      </div>
    </OpendexDashboard>
  );
}

// Estilos adicionales para la página de inicio
export const opendexHomeStyles = `
  .opendex-home-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .opendex-welcome-section {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .opendex-welcome-section h1 {
    color: #0066CC;
    font-size: 2.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  .opendex-welcome-section p {
    color: #5F6368;
    font-size: 1.125rem;
  }
  
  .opendex-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }
  
  .opendex-stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    border: 1px solid #E8EAED;
  }
  
  .opendex-stat-card h3 {
    color: #3C4043;
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .opendex-stat-number {
    color: #0066CC;
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
  }
  
  .opendex-quick-actions {
    background: white;
    padding: 2rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid #E8EAED;
  }
  
  .opendex-quick-actions h2 {
    color: #3C4043;
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }
  
  .opendex-action-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .opendex-action-button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #F8F9FA;
    border: 1px solid #E8EAED;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
    font-weight: 500;
    color: #3C4043;
  }
  
  .opendex-action-button:hover {
    background: #E6F2FF;
    border-color: #0066CC;
    color: #0066CC;
  }
  
  .opendex-action-button span {
    font-size: 1.25rem;
  }
  
  @media (max-width: 768px) {
    .opendex-home-page {
      padding: 1rem;
    }
    
    .opendex-welcome-section h1 {
      font-size: 2rem;
    }
    
    .opendex-stats-grid {
      grid-template-columns: 1fr;
    }
    
    .opendex-action-buttons {
      grid-template-columns: 1fr;
    }
  }
`;

// Exportar todos los componentes y configuraciones
export {
    OpendexAuthPage, opendexAuthStyles, OpendexDashboard, opendexDashboardMetadata, opendexDashboardStyles, OpendexFullAuthPage, OpendexHomePage, opendexHomeStyles, OpendexLayout, OpendexProjectConfig, opendexTheme, useOpendexStack
};

