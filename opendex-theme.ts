/**
 * Tema corporativo personalizado para Opendex Corporation
 * Colores y estilos específicos de la marca Opendex Identity Employee
 */

export const opendexTheme = {
  light: {
    // Colores corporativos principales
    background: 'hsl(0 0% 100%)',                    // Fondo blanco corporativo
    foreground: 'hsl(220 15% 15%)',                  // Texto principal oscuro
    
    // Color primario: Azul corporativo Opendex
    primary: 'hsl(210 100% 45%)',                    // #0066CC - Azul corporativo
    primaryForeground: 'hsl(0 0% 100%)',            // Blanco sobre azul
    
    // Color secundario: Gris corporativo
    secondary: 'hsl(220 8% 95%)',                    // Gris claro corporativo
    secondaryForeground: 'hsl(220 15% 25%)',        // Texto sobre gris
    
    // Color de acento: Verde corporativo
    accent: 'hsl(142 76% 36%)',                      // #0F9D58 - Verde corporativo
    accentForeground: 'hsl(0 0% 100%)',             // Blanco sobre verde
    
    // Colores de estado
    destructive: 'hsl(0 84% 60%)',                   // Rojo para errores
    destructiveForeground: 'hsl(0 0% 100%)',        // Blanco sobre rojo
    success: 'hsl(142 76% 36%)',                     // Verde para éxito
    successForeground: 'hsl(0 0% 100%)',            // Blanco sobre verde
    
    // Elementos de interfaz
    muted: 'hsl(220 8% 95%)',                        // Elementos silenciados
    mutedForeground: 'hsl(220 8% 45%)',             // Texto silenciado
    border: 'hsl(220 8% 90%)',                       // Bordes sutiles
    input: 'hsl(220 8% 90%)',                        // Campos de entrada
    ring: 'hsl(210 100% 45%)',                       // Anillo de enfoque azul
    
    // Tarjetas y popovers
    card: 'hsl(0 0% 100%)',                          // Fondo de tarjetas
    cardForeground: 'hsl(220 15% 15%)',             // Texto en tarjetas
    popover: 'hsl(0 0% 100%)',                       // Fondo de popovers
    popoverForeground: 'hsl(220 15% 15%)',          // Texto en popovers
  },
  dark: {
    // Modo oscuro corporativo
    background: 'hsl(220 15% 8%)',                   // Fondo oscuro corporativo
    foreground: 'hsl(0 0% 95%)',                     // Texto claro
    
    // Color primario en modo oscuro
    primary: 'hsl(210 100% 55%)',                    // Azul más brillante
    primaryForeground: 'hsl(220 15% 8%)',           // Texto oscuro sobre azul
    
    // Color secundario oscuro
    secondary: 'hsl(220 8% 15%)',                    // Gris oscuro
    secondaryForeground: 'hsl(0 0% 95%)',           // Texto claro sobre gris
    
    // Color de acento oscuro
    accent: 'hsl(142 76% 46%)',                      // Verde más brillante
    accentForeground: 'hsl(220 15% 8%)',            // Texto oscuro sobre verde
    
    // Colores de estado oscuros
    destructive: 'hsl(0 84% 70%)',                   // Rojo más brillante
    destructiveForeground: 'hsl(220 15% 8%)',       // Texto oscuro sobre rojo
    success: 'hsl(142 76% 46%)',                     // Verde más brillante
    successForeground: 'hsl(220 15% 8%)',           // Texto oscuro sobre verde
    
    // Elementos de interfaz oscuros
    muted: 'hsl(220 8% 15%)',                        // Elementos silenciados oscuros
    mutedForeground: 'hsl(220 8% 65%)',             // Texto silenciado claro
    border: 'hsl(220 8% 20%)',                       // Bordes oscuros
    input: 'hsl(220 8% 20%)',                        // Campos oscuros
    ring: 'hsl(210 100% 55%)',                       // Anillo de enfoque azul claro
    
    // Tarjetas y popovers oscuros
    card: 'hsl(220 15% 8%)',                         // Fondo de tarjetas oscuro
    cardForeground: 'hsl(0 0% 95%)',                // Texto claro en tarjetas
    popover: 'hsl(220 15% 8%)',                      // Fondo de popovers oscuro
    popoverForeground: 'hsl(0 0% 95%)',             // Texto claro en popovers
  },
  radius: '0.5rem', // Radio de bordes corporativo
};

// Paleta de colores corporativos Opendex
export const opendexColors = {
  primary: {
    50: '#E6F2FF',
    100: '#CCE5FF',
    200: '#99CCFF',
    300: '#66B2FF',
    400: '#3399FF',
    500: '#0066CC',  // Color principal corporativo
    600: '#0052A3',
    700: '#003D7A',
    800: '#002952',
    900: '#001429',
  },
  secondary: {
    50: '#F8F9FA',
    100: '#F1F3F4',
    200: '#E8EAED',
    300: '#DADCE0',
    400: '#BDC1C6',
    500: '#9AA0A6',
    600: '#80868B',
    700: '#5F6368',
    800: '#3C4043',
    900: '#202124',
  },
  accent: {
    50: '#E8F5E8',
    100: '#D1EBD1',
    200: '#A3D7A3',
    300: '#75C375',
    400: '#47AF47',
    500: '#0F9D58',  // Verde corporativo
    600: '#0C7E46',
    700: '#095F34',
    800: '#064022',
    900: '#032111',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  }
};

// Configuración de tipografía corporativa
export const opendexTypography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};

// Configuración de espaciado corporativo
export const opendexSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

// Configuración de sombras corporativas
export const opendexShadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};
