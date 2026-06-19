import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
// Stable in Angular 19 — removes Zone.js dependency entirely
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { routes } from './app.routes';

/**
 * Application-wide configuration for the Token Cost Analyzer.
 *
 * Key choices:
 * - `provideExperimentalZonelessChangeDetection()` — stable in Angular 19, removes Zone.js dependency
 *   for smaller bundle size and better performance.
 * - `provideHttpClient(withFetch())` — uses the native Fetch API for HTTP requests.
 * - `provideRouter(routes)` — enables client-side routing.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless change detection — stable in Angular 19, keeps "Experimental" name in 19.1.x
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ],
};
