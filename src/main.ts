import { initializeApp } from 'firebase/app';
import { bootstrapApplication } from '@angular/platform-browser';
import { Chart, registerables } from 'chart.js';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

Chart.register(...registerables);

initializeApp(environment.firebase);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
