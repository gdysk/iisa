import { Routes } from '@angular/router';

import { LandingComponent } from './components/landing/landing.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'candidate/:id', loadComponent: () => import('./components/candidate-view/candidate-view.component').then((m) => m.CandidateViewComponent) },
  { path: '**', redirectTo: '' },
];
