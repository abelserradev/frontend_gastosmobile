import { Routes } from '@angular/router';
import { ExpensesPageComponent } from './pages/expenses/expenses-page.component';
import { InitialFormComponent } from './pages/initial-form/initial-form.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { ProfilesPageComponent } from './pages/profiles/profiles-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'setup', component: InitialFormComponent },
  { path: 'profiles', component: ProfilesPageComponent },
  { path: 'expenses', component: ExpensesPageComponent },
  { path: '**', redirectTo: 'login' },
];
