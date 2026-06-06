import { Injectable } from '@angular/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

/**
 * Google Sign-In nativo vía Capacitor (Android/iOS).
 * El WebView no soporta signInWithPopup; este servicio usa el SDK nativo de Firebase.
 */
@Injectable({ providedIn: 'root' })
export class NativeGoogleAuthService {
  async signInAndGetIdToken(): Promise<string> {
    await FirebaseAuthentication.signInWithGoogle();
    // credential.idToken es OAuth de Google; Nest necesita el JWT de Firebase Auth.
    const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
    const firebaseIdToken = token?.trim();
    if (!firebaseIdToken) {
      throw new Error(
        'Firebase no devolvió idToken tras Google. Verificá SHA-1, google-services.json y Google habilitado.',
      );
    }
    return firebaseIdToken;
  }

  async signOut(): Promise<void> {
    await FirebaseAuthentication.signOut();
  }
}
