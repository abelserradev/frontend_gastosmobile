import { Injectable } from '@angular/core';
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  /** Popup Google → ID token para el backend Nest. */
  signInWithGoogle(): Observable<string> {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return from(signInWithPopup(auth, provider)).pipe(
      switchMap((cred) => from(cred.user.getIdToken())),
    );
  }

  signOutFirebase(): void {
    try {
      void signOut(getAuth());
    } catch {
      /* sin app o ya cerrado */
    }
  }
}
