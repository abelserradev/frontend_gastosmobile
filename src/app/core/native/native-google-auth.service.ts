import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

/**
 * Google Sign-In nativo vía Capacitor (Android/iOS).
 * El WebView no soporta signInWithPopup; este servicio usa el SDK nativo de Firebase.
 */
@Injectable({ providedIn: 'root' })
export class NativeGoogleAuthService {
  async signInAndGetIdToken(): Promise<string> {
    if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) {
      throw new Error(
        'Google nativo no está disponible: la APK se compiló sin google-services.json, Firebase no inició y el plugin no cargó. ' +
          'Descarga el JSON en Firebase (app Android com.gastos.mobile + SHA-1 debug), colócalo en android/app/, ejecuta mobile:publish-apk e instala la APK nueva. ' +
          'El deploy de Coolify (web/PR #188) no regenera la APK.',
      );
    }
    // Credential Manager (default) devuelve [16] account reauth failed en varios Samsung/debug.
    await FirebaseAuthentication.signInWithGoogle({
      useCredentialManager: false,
    });
    // credential.idToken es OAuth de Google; Nest necesita el JWT de Firebase Auth.
    const { token } = await FirebaseAuthentication.getIdToken({
      forceRefresh: true,
    });
    const firebaseIdToken = token?.trim();
    if (!firebaseIdToken) {
      throw new Error(
        'Firebase no devolvió idToken tras Google. Verifica SHA-1, google-services.json y Google habilitado.',
      );
    }
    return firebaseIdToken;
  }

  async signOut(): Promise<void> {
    await FirebaseAuthentication.signOut();
  }
}
