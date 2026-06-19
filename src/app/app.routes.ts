import { Routes } from '@angular/router';

/**
 * Application routes.
 * Currently a single-page layout; all components are displayed on the root route.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./app.component').then((m) => m.AppComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
