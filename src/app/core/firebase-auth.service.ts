import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';
import { Observable, from, switchMap } from 'rxjs';
import { NativeGoogleAuthService } from './native/native-google-auth.service';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private readonly nativeGoogle = inject(NativeGoogleAuthService);

  /**
   * Web: popup Firebase JS. Nativo (APK): Google Sign-In vía plugin Capacitor.
   * En ambos casos devuelve el idToken para POST /api/auth/firebase.
   */
  signInWithGoogle(): Observable<string> {
    if (Capacitor.isNativePlatform()) {
      return from(this.nativeGoogle.signInAndGetIdToken());
    }
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return from(signInWithPopup(auth, provider)).pipe(
      switchMap((cred) => from(cred.user.getIdToken())),
    );
  }

  signOutFirebase(): void {
    try {
      if (Capacitor.isNativePlatform()) {
        void this.nativeGoogle.signOut();
        return;
      }
      void signOut(getAuth());
    } catch {
      /* sin app o ya cerrado */
    }
  }
}
