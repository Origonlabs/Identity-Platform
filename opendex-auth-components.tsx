/**
 * Componentes de autenticación personalizados para Opendex Corporation
 * Integra la identidad visual corporativa con la funcionalidad de Opendex Identity Employee
 */

import {
    AuthPage,
    CredentialSignIn,
    CredentialSignUp,
    MagicLinkSignIn,
    OAuthButton,
    PasskeyButton,
    useStackApp
} from '@opendex/stack';
import React from 'react';

// Componente principal de página de autenticación corporativa
export function OpendexAuthPage({ 
  type, 
  fullPage = true 
}: { 
  type: 'sign-in' | 'sign-up';
  fullPage?: boolean;
}) {
  return (
    <div className="opendex-auth-page">
      <AuthPage type={type} fullPage={fullPage} />
    </div>
  );
}

// Componente de botón OAuth corporativo
export function OpendexOAuthButton({ 
  provider, 
  type 
}: { 
  provider: string;
  type: 'sign-in' | 'sign-up';
}) {
  const customStyles = {
    google: {
      backgroundColor: '#4285F4',
      textColor: '#FFFFFF',
      border: '1px solid #4285F4',
    },
    microsoft: {
      backgroundColor: '#2F2F2F',
      textColor: '#FFFFFF',
      border: '1px solid #2F2F2F',
    },
    github: {
      backgroundColor: '#24292e',
      textColor: '#ffffff',
      border: '1px solid #24292e',
    },
    linkedin: {
      backgroundColor: '#0073b1',
      textColor: '#ffffff',
      border: '1px solid #0073b1',
    },
  };

  return (
    <div className="opendex-oauth-button">
      <OAuthButton 
        provider={provider} 
        type={type}
        style={customStyles[provider as keyof typeof customStyles]}
      />
    </div>
  );
}

// Componente de grupo de botones OAuth corporativo
export function OpendexOAuthButtonGroup({ 
  type 
}: { 
  type: 'sign-in' | 'sign-up';
}) {
  const providers = ['google', 'microsoft', 'github', 'linkedin'];
  
  return (
    <div className="opendex-oauth-group">
      <div className="opendex-oauth-separator">
        <span>Continuar con</span>
      </div>
      
      <div className="opendex-oauth-buttons">
        {providers.map((provider) => (
          <OpendexOAuthButton 
            key={provider}
            provider={provider} 
            type={type} 
          />
        ))}
      </div>
    </div>
  );
}

// Componente de inicio de sesión con credenciales corporativo
export function OpendexCredentialSignIn() {
  return (
    <div className="opendex-credential-signin">
      <div className="opendex-form-header">
        <h3>Iniciar Sesión</h3>
        <p>Ingresa tus credenciales corporativas</p>
      </div>
      
      <CredentialSignIn />
      
      <div className="opendex-form-footer">
        <a href="/forgot-password" className="opendex-link">
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </div>
  );
}

// Componente de registro con credenciales corporativo
export function OpendexCredentialSignUp() {
  return (
    <div className="opendex-credential-signup">
      <div className="opendex-form-header">
        <h3>Crear Cuenta</h3>
        <p>Regístrate con tu email corporativo</p>
      </div>
      
      <CredentialSignUp />
      
      <div className="opendex-form-footer">
        <p>
          Al registrarte, aceptas los{' '}
          <a href="/terms" className="opendex-link">Términos de Servicio</a>
          {' '}y la{' '}
          <a href="/privacy" className="opendex-link">Política de Privacidad</a>
          {' '}de Opendex Corporation.
        </p>
      </div>
    </div>
  );
}

// Componente de inicio de sesión con magic link corporativo
export function OpendexMagicLinkSignIn() {
  return (
    <div className="opendex-magic-link">
      <div className="opendex-form-header">
        <h3>Inicio de Sesión Rápido</h3>
        <p>Te enviaremos un enlace de acceso a tu email</p>
      </div>
      
      <MagicLinkSignIn />
      
      <div className="opendex-form-footer">
        <p>
          Revisa tu bandeja de entrada y spam para el enlace de acceso.
        </p>
      </div>
    </div>
  );
}

// Componente de botón Passkey corporativo
export function OpendexPasskeyButton({ 
  type 
}: { 
  type: 'sign-in' | 'sign-up';
}) {
  return (
    <div className="opendex-passkey">
      <PasskeyButton type={type} />
    </div>
  );
}

// Componente de página de autenticación completa corporativa
export function OpendexFullAuthPage({ 
  type 
}: { 
  type: 'sign-in' | 'sign-up';
}) {
  const stackApp = useStackApp();
  
  return (
    <div className="opendex-full-auth">
      {/* Header corporativo */}
      <div className="opendex-auth-header">
        <div className="opendex-logo">
          <img 
            src="/opendex-logo.png" 
            alt="Opendex Corporation" 
            className="opendex-logo-img"
          />
        </div>
        
        <h1 className="opendex-title">
          {type === 'sign-in' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h1>
        
        <p className="opendex-subtitle">
          {type === 'sign-in' 
            ? 'Accede a tu cuenta de Opendex Identity Employee' 
            : 'Únete a Opendex Identity Employee'
          }
        </p>
      </div>
      
      {/* Contenido de autenticación */}
      <div className="opendex-auth-content">
        {/* Botones OAuth */}
        <OpendexOAuthButtonGroup type={type} />
        
        {/* Separador */}
        <div className="opendex-separator">
          <span>O continúa con</span>
        </div>
        
        {/* Formularios de credenciales */}
        {type === 'sign-in' ? (
          <OpendexCredentialSignIn />
        ) : (
          <OpendexCredentialSignUp />
        )}
        
        {/* Magic Link */}
        <div className="opendex-magic-link-section">
          <OpendexMagicLinkSignIn />
        </div>
        
        {/* Passkey */}
        <div className="opendex-passkey-section">
          <OpendexPasskeyButton type={type} />
        </div>
      </div>
      
      {/* Footer corporativo */}
      <div className="opendex-auth-footer">
        <p>
          {type === 'sign-in' ? (
            <>
              ¿No tienes cuenta?{' '}
              <a href={stackApp.urls.signUp} className="opendex-link">
                Regístrate aquí
              </a>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <a href={stackApp.urls.signIn} className="opendex-link">
                Inicia sesión aquí
              </a>
            </>
          )}
        </p>
        
        <div className="opendex-corporate-info">
          <p>
            © 2024 Opendex Corporation. Todos los derechos reservados.
          </p>
          <div className="opendex-links">
            <a href="/terms" className="opendex-link">Términos</a>
            <a href="/privacy" className="opendex-link">Privacidad</a>
            <a href="/support" className="opendex-link">Soporte</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Estilos CSS adicionales para componentes corporativos
export const opendexAuthStyles = `
  .opendex-auth-page {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }
  
  .opendex-oauth-group {
    margin-bottom: 1.5rem;
  }
  
  .opendex-oauth-separator {
    text-align: center;
    margin: 1rem 0;
    position: relative;
  }
  
  .opendex-oauth-separator::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #DADCE0;
  }
  
  .opendex-oauth-separator span {
    background-color: white;
    padding: 0 1rem;
    color: #5F6368;
    font-size: 0.875rem;
  }
  
  .opendex-oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .opendex-oauth-button {
    width: 100%;
  }
  
  .opendex-form-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  .opendex-form-header h3 {
    color: var(--opendex-primary);
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .opendex-form-header p {
    color: #5F6368;
    font-size: 0.875rem;
    margin: 0;
  }
  
  .opendex-form-footer {
    text-align: center;
    margin-top: 1rem;
  }
  
  .opendex-form-footer p {
    font-size: 0.75rem;
    color: #5F6368;
    line-height: 1.4;
  }
  
  .opendex-separator {
    text-align: center;
    margin: 1.5rem 0;
    position: relative;
  }
  
  .opendex-separator::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #DADCE0;
  }
  
  .opendex-separator span {
    background-color: white;
    padding: 0 1rem;
    color: #5F6368;
    font-size: 0.875rem;
  }
  
  .opendex-magic-link-section,
  .opendex-passkey-section {
    margin-top: 1.5rem;
  }
  
  .opendex-auth-footer {
    text-align: center;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #E8EAED;
  }
  
  .opendex-corporate-info {
    margin-top: 1rem;
  }
  
  .opendex-corporate-info p {
    font-size: 0.75rem;
    color: #5F6368;
    margin-bottom: 0.5rem;
  }
  
  .opendex-links {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }
  
  .opendex-links a {
    font-size: 0.75rem;
    color: var(--opendex-primary);
    text-decoration: none;
  }
  
  .opendex-links a:hover {
    text-decoration: underline;
  }
  
  @media (max-width: 640px) {
    .opendex-oauth-buttons {
      gap: 0.5rem;
    }
    
    .opendex-links {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
`;
