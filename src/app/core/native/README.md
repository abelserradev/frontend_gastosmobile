# Servicios Nativos (Capacitor)

Esta carpeta contiene wrappers de plugins Capacitor y abstracciones para APIs nativas.

## Principios

1. **Wrapper pattern:** Cada servicio oculta qué plugin específico usamos
2. **Consumidores desacoplados:** Los componentes y otros servicios no saben si usamos plugin nativo o Web API
3. **Fallback web:** Siempre intentar Web API primero, fallback a plugin nativo si es necesario

## Estructura

```
native/
├── platform.service.ts      # Detección de plataforma, utilidades
├── native-google-auth.service.ts  # Google Sign-In nativo (APK)
├── camera.service.ts        # Captura de fotos (cuando se añada Camera plugin)
├── storage.service.ts       # Preferencias nativas vs localStorage
├── network.service.ts       # Estado de conectividad
└── README.md               # Este archivo
```

## Cuándo añadir un servicio

- Necesitas una API nativa (cámara, geolocalización, filesystem)
- La Web API no es suficiente o no funciona bien en WebView
- Hay un plugin Capacitor estable disponible

## Ejemplo de consumo

```typescript
// En un componente o servicio
export class ExpenseFormComponent {
  constructor(private nativeCamera: NativeCameraService) {}

  async onCaptureReceipt() {
    // No sabemos si usa MediaDevices o Camera plugin
    // El servicio decide la mejor implementación
    const photo = await this.nativeCamera.captureReceipt();
    this.receiptImage = photo.dataUrl;
  }
}
```

## Plugins disponibles (no instalados aún)

- `@capacitor/camera` — Fotos con cámara o galería
- `@capacitor/preferences` — Settings persistentes
- `@capacitor/network` — Estado de red
- `@capacitor/filesystem` — Acceso al filesystem
- `@capacitor/splash-screen` — Pantalla de inicio nativa

Ver SDD-mobile-capacitor para detalles de instalación y roadmap.

---

*Ver: [[../../../../obsidian-vault/03-Arquitectura/SDD-mobile-capacitor]]*
