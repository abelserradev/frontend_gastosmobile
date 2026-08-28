import { Routes } from '@angular/router';
import {
  requiresPasswordGuard,
  setupPasswordFlowGuard,
} from './core/auth-flow.guards';
import { AppAndroidPageComponent } from './pages/app-android/app-android-page.component';
import { ExpensesPageComponent } from './pages/expenses/expenses-page.component';
import { InitialFormComponent } from './pages/initial-form/initial-form.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { ProfilesPageComponent } from './pages/profiles/profiles-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password/reset-password-page.component';
import { SetupPasswordPageComponent } from './pages/setup-password/setup-password-page.component';
import { HistorialPageComponent } from './pages/historial/historial-page.component';
import { InventoryPageComponent } from './pages/inventory/inventory-page.component';
import { InvitationsPageComponent } from './pages/invitations/invitations-page.component';
import { SplashPageComponent } from './pages/splash/splash-page.component';

/**
 * Rutas de Spend$ave (mobile).
 *
 * - '/' → Splash screen con animación y verificación de sesión
 * - '/login' → Login/Registro mobile-optimizado
 * - Rutas protegidas requieren sesión válida
 */
export const routes: Routes = [
  { path: '', component: SplashPageComponent },
  { path: 'login', component: LoginPageComponent },
  {
    path: 'setup-password',
    component: SetupPasswordPageComponent,
    canActivate: [setupPasswordFlowGuard],
  },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  {
    path: 'setup',
    component: InitialFormComponent,
    canActivate: [requiresPasswordGuard],
  },
  {
    path: 'profiles',
    component: ProfilesPageComponent,
    canActivate: [requiresPasswordGuard],
  },
  {
    path: 'expenses',
    component: ExpensesPageComponent,
    canActivate: [requiresPasswordGuard],
  },
  {
    path: 'historial/:ym',
    component: HistorialPageComponent,
    canActivate: [requiresPasswordGuard],
  },
  {
    path: 'historial',
    component: HistorialPageComponent,
    canActivate: [requiresPasswordGuard],
  },
  {
    path: 'invitations',
    component: InvitationsPageComponent,
    canActivate: [requiresPasswordGuard],
  },
  {
    path: 'inventory',
    component: InventoryPageComponent,
    canActivate: [requiresPasswordGuard],
  },
  {
    path: 'app-android',
    component: AppAndroidPageComponent,
    canActivate: [requiresPasswordGuard],
  },
  { path: '**', redirectTo: 'login' },
];
