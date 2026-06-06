import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * Servicio de utilidades para detección de plataforma y capacidades nativas.
 *
 * Toda lógica de `Capacitor.isNativePlatform()`, `getPlatform()` debe
 * centralizarse aquí para evitar dependencias dispersas.
 */
@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  /**
   * true si estamos ejecutando en un dispositivo nativo (Android/iOS)
   * false si es navegador web normal
   */
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Plataforma actual: 'android', 'ios', o 'web'
   */
  get platform(): 'android' | 'ios' | 'web' {
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  }

  /**
   * true si es Android nativo
   */
  get isAndroid(): boolean {
    return this.platform === 'android';
  }

  /**
   * true si es iOS nativo
   */
  get isIos(): boolean {
    return this.platform === 'ios';
  }

  /**
   * true si es Web (navegador o WebView sin Capacitor)
   */
  get isWeb(): boolean {
    return this.platform === 'web';
  }

  /**
   * true si es WebView de Capacitor (android o ios)
   * Útil para saber si tenemos acceso al bridge nativo
   */
  get isCapacitorWebView(): boolean {
    return this.isNative;
  }
}
