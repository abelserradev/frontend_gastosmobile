import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_DEVELOPER_ATTRIBUTION,
  LEGAL_HOLDER_NAME,
  type LegalDocumentMeta,
  type LegalDocumentSlug,
} from './legal.constants';

function contactLine(): string {
  return `Puedes escribir a ${LEGAL_CONTACT_EMAIL} indicando el correo de tu cuenta Spend$ave.`;
}

export function getLegalDocument(slug: LegalDocumentSlug): LegalDocumentMeta {
  const docs = buildLegalDocuments();
  return docs[slug];
}

export function getAllLegalSlugs(): LegalDocumentSlug[] {
  return ['privacidad', 'terminos', 'cookies', 'aviso-legal'];
}

function buildLegalDocuments(): Record<LegalDocumentSlug, LegalDocumentMeta> {
  const responsable = LEGAL_HOLDER_NAME;

  return {
    privacidad: {
      slug: 'privacidad',
      title: 'Política de privacidad',
      metaDescription:
        'Cómo Spend$ave trata tus datos personales, finanzas, comprobantes y autenticación.',
      sections: [
        {
          heading: '1. Responsable',
          paragraphs: [
            `${responsable} (marca personal) es responsable del tratamiento de los datos personales asociados a la aplicación Spend$ave (web y Android). El software está ${LEGAL_DEVELOPER_ATTRIBUTION}.`,
            contactLine(),
          ],
        },
        {
          heading: '2. Datos que recopilamos',
          paragraphs: [
            'Datos de cuenta: correo electrónico, nombre o alias, hash de contraseña (si registras con email), e identificadores de Firebase cuando usas Google u otros proveedores soportados.',
            'Datos financieros que tú ingresas: perfiles (familiar, grupal o comercio), gastos, ingresos, categorías, periodos presupuestarios, inventario y movimientos en perfiles comercio, invitaciones a colaboradores y preferencias de la app.',
            'Comprobantes: imágenes o archivos que subes para gastos; pueden procesarse con OCR (Tesseract y modelos locales vía Ollama en nuestro servidor) para sugerir montos y datos de factura.',
            'Datos técnicos mínimos: registros de servidor, dirección IP aproximada en logs de seguridad, y tokens de sesión (cookie httpOnly en web o almacenamiento seguro en la app móvil).',
            'Telegram (opcional): si vinculas tu cuenta, guardamos el identificador de chat de Telegram para ejecutar comandos que tú autorizas desde el bot.',
          ],
        },
        {
          heading: '3. Finalidades',
          paragraphs: [
            'Prestar el servicio de control de gastos, inventario y colaboración entre perfiles.',
            'Autenticarte, proteger tu cuenta y cumplir solicitudes de recuperación de acceso.',
            'Enviar correos transaccionales (bienvenida, restablecimiento de contraseña, invitaciones) mediante Resend.',
            'Mostrar la tasa BCV consultada a fuentes públicas para conversión informativa Bs/USD.',
            'Mejorar la precisión del OCR cuando envías feedback sobre lecturas de facturas (sin usar tus datos para entrenar modelos públicos de terceros).',
          ],
        },
        {
          heading: '4. Base y conservación',
          paragraphs: [
            'El tratamiento se basa en la ejecución del contrato (términos de uso), tu consentimiento al registrarte y, en su caso, el interés legítimo de seguridad del servicio.',
            'Conservamos los datos mientras mantengas la cuenta activa y el tiempo necesario para obligaciones legales o resolución de incidencias. Puedes solicitar la eliminación de la cuenta contactándonos.',
          ],
        },
        {
          heading: '5. Encargados y transferencias',
          paragraphs: [
            'Google Firebase (autenticación), Resend (correo), proveedor de hosting en buildforge.work (infraestructura Coolify/Docker). Los comprobantes y datos financieros permanecen en nuestra base PostgreSQL bajo nuestro control.',
            'No vendemos tus datos personales. Solo compartimos con terceros lo necesario para operar el servicio descrito.',
          ],
        },
        {
          heading: '6. Tus derechos',
          paragraphs: [
            'Puedes solicitar acceso, rectificación, supresión, limitación u oposición escribiendo al correo de contacto. Responderemos en un plazo razonable.',
            'Si usas login con Google, también puedes revocar permisos desde tu cuenta Google; ello puede impedir el acceso a Spend$ave hasta que vuelvas a autorizar.',
          ],
        },
        {
          heading: '7. Menores',
          paragraphs: [
            'Spend$ave no está dirigida a menores de 16 años. Si detectamos un registro indebido, podemos eliminar la cuenta.',
          ],
        },
        {
          heading: '8. Cambios',
          paragraphs: [
            'Publicaremos actualizaciones en esta misma URL. El uso continuado tras un cambio relevante implica aceptación de la política revisada.',
            'Documentos relacionados: Términos de uso (/terminos), Cookies (/cookies), Aviso legal (/aviso-legal).',
          ],
        },
      ],
    },
    terminos: {
      slug: 'terminos',
      title: 'Términos de uso',
      metaDescription:
        'Condiciones de uso de Spend$ave: cuentas, perfiles, responsabilidad y servicio.',
      sections: [
        {
          heading: '1. Aceptación',
          paragraphs: [
            `Al crear una cuenta o usar Spend$ave aceptas estos términos con ${responsable}. Si no estás de acuerdo, no uses el servicio.`,
          ],
        },
        {
          heading: '2. El servicio',
          paragraphs: [
            'Spend$ave es una herramienta de organización personal y comercial de gastos, ingresos e inventario. No somos una entidad financiera, no otorgamos crédito ni asesoría fiscal o legal.',
            'Las tasas BCV y conversiones mostradas son informativas; verifica montos oficiales antes de decisiones económicas importantes.',
          ],
        },
        {
          heading: '3. Cuenta y seguridad',
          paragraphs: [
            'Eres responsable de mantener la confidencialidad de tu contraseña y del acceso a tu dispositivo. Notifica de inmediato cualquier uso no autorizado.',
            'Podemos suspender cuentas por fraude, abuso del API, intentos de intrusión o incumplimiento grave de estos términos.',
          ],
        },
        {
          heading: '4. Contenido del usuario',
          paragraphs: [
            'Conservas la titularidad de los datos que cargas. Nos concedes una licencia limitada para almacenarlos, procesarlos y mostrarlos solo para prestarte el servicio (incluido OCR de comprobantes que tú subes).',
            'No debes subir contenido ilegal, malware o que vulnere derechos de terceros.',
          ],
        },
        {
          heading: '5. Perfiles comercio y colaboradores',
          paragraphs: [
            'En perfiles tipo comercio puedes invitar colaboradores. Eres responsable de que tengan autorización para ver o editar la información compartida.',
          ],
        },
        {
          heading: '6. Disponibilidad',
          paragraphs: [
            'El servicio se ofrece “tal cual”. Podemos aplicar mantenimientos, actualizaciones o interrupciones temporales sin aviso previo en entornos de prueba.',
          ],
        },
        {
          heading: '7. Limitación de responsabilidad',
          paragraphs: [
            'En la medida permitida por la ley, no respondemos por pérdidas indirectas derivadas del uso o imposibilidad de uso de la app, errores de OCR, o decisiones tomadas solo con base en la información mostrada.',
          ],
        },
        {
          heading: '8. Ley aplicable y contacto',
          paragraphs: [
            'Estos términos se interpretan conforme a las leyes aplicables en Venezuela, sin perjuicio de normas imperativas de protección al consumidor que te correspondan.',
            contactLine(),
            'Política de privacidad: /privacidad',
          ],
        },
      ],
    },
    cookies: {
      slug: 'cookies',
      title: 'Política de cookies y almacenamiento local',
      metaDescription:
        'Cookies, tokens y almacenamiento local usados por Spend$ave en web y Android.',
      sections: [
        {
          heading: '1. Qué usamos',
          paragraphs: [
            'En la versión web podemos usar una cookie httpOnly con el token de sesión JWT tras iniciar sesión, para mantenerte autenticado de forma segura.',
            'En la app Android (Capacitor) el token puede guardarse en almacenamiento nativo seguro equivalente, no en cookies del navegador.',
            'Firebase Auth puede establecer cookies o almacenamiento propio al usar “Continuar con Google”.',
            'No usamos cookies de publicidad comportamental de terceros en Spend$ave.',
          ],
        },
        {
          heading: '2. Finalidad',
          paragraphs: [
            'Autenticación, preferencias de sesión, protección CSRF/API (cabeceras de cliente) y funcionamiento básico de la SPA.',
          ],
        },
        {
          heading: '3. Control',
          paragraphs: [
            'Puedes cerrar sesión desde la app para invalidar el uso activo del token en tu dispositivo.',
            'Borrar cookies del sitio en el navegador cerrará tu sesión web. En Android, desinstalar la app elimina datos locales.',
          ],
        },
        {
          heading: '4. Más información',
          paragraphs: [
            'Detalle del tratamiento de datos personales: /privacidad',
            contactLine(),
          ],
        },
      ],
    },
    'aviso-legal': {
      slug: 'aviso-legal',
      title: 'Aviso legal',
      metaDescription:
        'Titular del sitio Spend$ave, contacto y enlaces a políticas legales.',
      sections: [
        {
          heading: 'Titular del sitio',
          paragraphs: [
            `Sitio y aplicación Spend$ave operados bajo la marca personal ${responsable}.`,
            `Contacto: ${LEGAL_CONTACT_EMAIL}`,
            `${LEGAL_DEVELOPER_ATTRIBUTION}.`,
          ],
        },
        {
          heading: 'Propiedad intelectual',
          paragraphs: [
            'El diseño, código y marca Spend$ave están protegidos. No está permitida la reproducción comercial sin autorización expresa del titular.',
          ],
        },
        {
          heading: 'Enlaces',
          paragraphs: [
            'Política de privacidad: /privacidad',
            'Términos de uso: /terminos',
            'Cookies y almacenamiento: /cookies',
          ],
        },
      ],
    },
  };
}
