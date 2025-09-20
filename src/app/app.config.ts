import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';

import { IndexedDBService } from './services/indexeddb.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      const db = inject(IndexedDBService);
      return db.init();
    }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }), withComponentInputBinding(), withViewTransitions()),
    provideAnimations(),
    provideCharts(withDefaultRegisterables()),
  ],
};
