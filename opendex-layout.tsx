/**
 * Layout corporativo para Opendex Corporation
 * Integra el tema personalizado y la identidad visual de Opendex Identity Employee
 */

import { StackTheme } from '@stackframe/stack';
import React from 'react';
import { opendexTheme } from './opendex-theme';

interface OpendexLayoutProps {
  children: React.ReactNode;
}

export function OpendexLayout({ children }: OpendexLayoutProps) {
  return (
    <html lang="es">
      <head>
        {/* Metadatos corporativos */}
        <title>Opendex Corporation - Opendex Identity Employee</title>
        <meta name="description" content="Sistema de identidad de empleados corporativo de Opendex Corporation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Favicon corporativo */}
        <link rel="icon" href="/opendex-favicon.ico" />
        
        {/* Fuentes corporativas */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
        
        {/* Estilos corporativos globales */}
        <style jsx global>{`
          :root {
            /* Variables CSS corporativas */
            --opendex-primary: ${opendexTheme.light.primary};
            --opendex-secondary: ${opendexTheme.light.secondary};
            --opendex-accent: ${opendexTheme.light.accent};
            --opendex-background: ${opendexTheme.light.background};
            --opendex-foreground: ${opendexTheme.light.foreground};
            
            /* Tipografía corporativa */
            --font-sans: 'Inter', system-ui, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
          }
          
          /* Estilos globales corporativos */
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: var(--font-sans);
            background-color: var(--opendex-background);
            color: var(--opendex-foreground);
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          
          /* Estilos para componentes de autenticación */
          .opendex-auth-container {
            background: linear-gradient(135deg, #E6F2FF 0%, #F8F9FA 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          
          .opendex-auth-card {
            background: white;
            border-radius: 0.75rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            border: 1px solid #E8EAED;
          }
          
          .opendex-logo {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .opendex-logo img {
            height: 60px;
            width: auto;
          }
          
          .opendex-title {
            color: var(--opendex-primary);
            font-size: 1.5rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.5rem;
          }
          
          .opendex-subtitle {
            color: #5F6368;
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 2rem;
          }
          
          /* Estilos para botones corporativos */
          .opendex-button {
            background-color: var(--opendex-primary);
            color: white;
            border: none;
            border-radius: 0.5rem;
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
          }
          
          .opendex-button:hover {
            background-color: #0052A3;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
          }
          
          .opendex-button:active {
            transform: translateY(0);
          }
          
          /* Estilos para campos de entrada */
          .opendex-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #DADCE0;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            transition: border-color 0.2s ease;
            background-color: white;
          }
          
          .opendex-input:focus {
            outline: none;
            border-color: var(--opendex-primary);
            box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
          }
          
          /* Estilos para enlaces */
          .opendex-link {
            color: var(--opendex-primary);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
          }
          
          .opendex-link:hover {
            color: #0052A3;
            text-decoration: underline;
          }
          
          /* Estilos para mensajes de estado */
          .opendex-success {
            background-color: #E8F5E8;
            color: #0F9D58;
            padding: 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid #A3D7A3;
            margin-bottom: 1rem;
          }
          
          .opendex-error {
            background-color: #FFEBEE;
            color: #D32F2F;
            padding: 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid #FFCDD2;
            margin-bottom: 1rem;
          }
          
          /* Responsive design */
          @media (max-width: 640px) {
            .opendex-auth-container {
              padding: 0.5rem;
            }
            
            .opendex-auth-card {
              padding: 1.5rem;
            }
            
            .opendex-logo img {
              height: 50px;
            }
          }
        `}</style>
      </head>
      <body>
        <StackTheme theme={opendexTheme}>
          <div className="opendex-auth-container">
            <div className="opendex-auth-card">
              {/* Header corporativo */}
              <div className="opendex-logo">
                <img 
                  src="/opendex-logo.png" 
                  alt="Opendex Corporation" 
                  className="opendex-logo-img"
                />
              </div>
              
              <h1 className="opendex-title">
                Opendex Corporation
              </h1>
              
              <p className="opendex-subtitle">
                Opendex Identity Employee
              </p>
              
              {/* Contenido de autenticación */}
              {children}
            </div>
          </div>
        </StackTheme>
      </body>
    </html>
  );
}
