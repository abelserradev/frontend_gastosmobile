import { Routes } from '@angular/router';
import {
  requiresPasswordGuard,
  setupPasswordFlowGuard,
} from './core/auth-flow.guards';
import { ExpensesPageComponent } from './pages/expenses/expenses-page.component';
import { InitialFormComponent } from './pages/initial-form/initial-form.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { ProfilesPageComponent } from './pages/profiles/profiles-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password/reset-password-page.component';
import { SetupPasswordPageComponent } from './pages/setup-password/setup-password-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
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
  { path: '**', redirectTo: 'login' },
];
