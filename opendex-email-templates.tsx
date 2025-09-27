/**
 * Plantillas de email corporativas para Opendex Corporation
 * Diseño profesional y consistente con la identidad visual de Opendex Identity Employee
 */

import React from 'react';

// Plantilla base para emails corporativos
export function OpendexEmailTemplate({ 
  children, 
  title, 
  subtitle 
}: { 
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      padding: '0',
    }}>
      {/* Header corporativo */}
      <div style={{
        backgroundColor: '#0066CC',
        padding: '30px 20px',
        textAlign: 'center',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
      }}>
        <img 
          src="https://opendex.com/logo-white.png" 
          alt="Opendex Corporation" 
          style={{ 
            height: '50px', 
            width: 'auto',
            marginBottom: '10px'
          }}
        />
        <h1 style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '600',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            color: '#E6F2FF',
            fontSize: '16px',
            margin: '10px 0 0 0',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Contenido principal */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '40px 30px',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {children}
      </div>
      
      {/* Footer corporativo */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px 30px',
        textAlign: 'center',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
      }}>
        <p style={{
          color: '#5F6368',
          fontSize: '14px',
          margin: '0 0 10px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          © 2024 Opendex Corporation. Todos los derechos reservados.
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <a href="https://opendex.com/terms" style={{
            color: '#0066CC',
            textDecoration: 'none',
            fontSize: '12px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            Términos de Servicio
          </a>
          <a href="https://opendex.com/privacy" style={{
            color: '#0066CC',
            textDecoration: 'none',
            fontSize: '12px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            Política de Privacidad
          </a>
          <a href="https://opendex.com/support" style={{
            color: '#0066CC',
            textDecoration: 'none',
            fontSize: '12px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            Soporte
          </a>
        </div>
      </div>
    </div>
  );
}

// Email de bienvenida corporativo
export function OpendexWelcomeEmail({ 
  user, 
  loginUrl 
}: { 
  user: { displayName: string; email: string };
  loginUrl: string;
}) {
  return (
    <OpendexEmailTemplate 
      title="¡Bienvenido a Opendex Corporation!"
      subtitle="Tu cuenta ha sido creada exitosamente"
    >
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{
          color: '#0066CC',
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 15px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Hola {user.displayName},
        </h2>
        <p style={{
          color: '#3C4043',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          ¡Bienvenido a Opendex Identity Employee!
        </p>
      </div>
      
      <div style={{
        backgroundColor: '#E6F2FF',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #CCE5FF'
      }}>
        <h3 style={{
          color: '#0066CC',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 10px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Información de tu cuenta:
        </h3>
        <p style={{
          color: '#3C4043',
          fontSize: '14px',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <strong>Email:</strong> {user.email}
        </p>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <a 
          href={loginUrl}
          style={{
            backgroundColor: '#0066CC',
            color: '#ffffff',
            padding: '12px 30px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            display: 'inline-block',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Acceder a mi cuenta
        </a>
      </div>
      
      <div style={{
        borderTop: '1px solid #E8EAED',
        paddingTop: '20px',
        marginTop: '30px'
      }}>
        <h3 style={{
          color: '#3C4043',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 15px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Próximos pasos:
        </h3>
        <ul style={{
          color: '#5F6368',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0',
          paddingLeft: '20px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <li>Completa tu perfil corporativo</li>
          <li>Configura tu autenticación de dos factores</li>
          <li>Explora las funcionalidades disponibles</li>
          <li>Contacta al equipo de soporte si necesitas ayuda</li>
        </ul>
      </div>
    </OpendexEmailTemplate>
  );
}

// Email de verificación de email corporativo
export function OpendexEmailVerificationEmail({ 
  user, 
  verificationUrl 
}: { 
  user: { displayName: string; email: string };
  verificationUrl: string;
}) {
  return (
    <OpendexEmailTemplate 
      title="Verifica tu email"
      subtitle="Confirma tu dirección de correo electrónico"
    >
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{
          color: '#0066CC',
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 15px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Hola {user.displayName},
        </h2>
        <p style={{
          color: '#3C4043',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Para completar tu registro en Opendex Identity Employee, necesitamos verificar tu dirección de email.
        </p>
      </div>
      
      <div style={{
        backgroundColor: '#FFF3E0',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #FFE0B2'
      }}>
        <h3 style={{
          color: '#F57C00',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 10px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          ⚠️ Acción requerida
        </h3>
        <p style={{
          color: '#3C4043',
          fontSize: '14px',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Haz clic en el botón de abajo para verificar tu email y activar tu cuenta.
        </p>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <a 
          href={verificationUrl}
          style={{
            backgroundColor: '#0F9D58',
            color: '#ffffff',
            padding: '12px 30px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            display: 'inline-block',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Verificar mi email
        </a>
      </div>
      
      <div style={{
        borderTop: '1px solid #E8EAED',
        paddingTop: '20px',
        marginTop: '30px'
      }}>
        <p style={{
          color: '#5F6368',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0 0 10px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:
        </p>
        <p style={{
          color: '#0066CC',
          fontSize: '12px',
          wordBreak: 'break-all',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          {verificationUrl}
        </p>
      </div>
    </OpendexEmailTemplate>
  );
}

// Email de restablecimiento de contraseña corporativo
export function OpendexPasswordResetEmail({ 
  user, 
  resetUrl 
}: { 
  user: { displayName: string; email: string };
  resetUrl: string;
}) {
  return (
    <OpendexEmailTemplate 
      title="Restablecer contraseña"
      subtitle="Solicitud de cambio de contraseña"
    >
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{
          color: '#0066CC',
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 15px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Hola {user.displayName},
        </h2>
        <p style={{
          color: '#3C4043',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en Opendex Identity Employee.
        </p>
      </div>
      
      <div style={{
        backgroundColor: '#FFEBEE',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #FFCDD2'
      }}>
        <h3 style={{
          color: '#D32F2F',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 10px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          🔒 Seguridad de la cuenta
        </h3>
        <p style={{
          color: '#3C4043',
          fontSize: '14px',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Si no solicitaste este cambio, ignora este email. Tu contraseña permanecerá sin cambios.
        </p>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <a 
          href={resetUrl}
          style={{
            backgroundColor: '#D32F2F',
            color: '#ffffff',
            padding: '12px 30px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            display: 'inline-block',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Restablecer contraseña
        </a>
      </div>
      
      <div style={{
        borderTop: '1px solid #E8EAED',
        paddingTop: '20px',
        marginTop: '30px'
      }}>
        <h3 style={{
          color: '#3C4043',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 15px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Información importante:
        </h3>
        <ul style={{
          color: '#5F6368',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0',
          paddingLeft: '20px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <li>Este enlace expira en 24 horas</li>
          <li>Usa una contraseña segura y única</li>
          <li>No compartas este enlace con nadie</li>
          <li>Contacta al soporte si tienes problemas</li>
        </ul>
      </div>
    </OpendexEmailTemplate>
  );
}

// Email de invitación a equipo corporativo
export function OpendexTeamInvitationEmail({ 
  user, 
  teamName, 
  invitationUrl,
  inviterName 
}: { 
  user: { displayName: string; email: string };
  teamName: string;
  invitationUrl: string;
  inviterName: string;
}) {
  return (
    <OpendexEmailTemplate 
      title="Invitación a equipo"
      subtitle={`Te han invitado a unirte a ${teamName}`}
    >
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{
          color: '#0066CC',
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 15px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Hola {user.displayName},
        </h2>
        <p style={{
          color: '#3C4043',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <strong>{inviterName}</strong> te ha invitado a unirte al equipo <strong>{teamName}</strong> en Opendex Identity Employee.
        </p>
      </div>
      
      <div style={{
        backgroundColor: '#E8F5E8',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #A3D7A3'
      }}>
        <h3 style={{
          color: '#0F9D58',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 10px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          🎉 ¡Únete al equipo!
        </h3>
        <p style={{
          color: '#3C4043',
          fontSize: '14px',
          margin: '0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Acepta esta invitación para acceder a las herramientas y recursos del equipo.
        </p>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <a 
          href={invitationUrl}
          style={{
            backgroundColor: '#0F9D58',
            color: '#ffffff',
            padding: '12px 30px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            display: 'inline-block',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Aceptar invitación
        </a>
      </div>
      
      <div style={{
        borderTop: '1px solid #E8EAED',
        paddingTop: '20px',
        marginTop: '30px'
      }}>
        <h3 style={{
          color: '#3C4043',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 15px 0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          Beneficios del equipo:
        </h3>
        <ul style={{
          color: '#5F6368',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0',
          paddingLeft: '20px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <li>Acceso a recursos compartidos del equipo</li>
          <li>Colaboración en tiempo real</li>
          <li>Herramientas de gestión de proyectos</li>
          <li>Comunicación integrada</li>
        </ul>
      </div>
    </OpendexEmailTemplate>
  );
}
