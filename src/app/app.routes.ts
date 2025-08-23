import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/tree-view/tree-view.component').then((m) => m.TreeViewComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile').then((m) => m.ProfileComponent),
  },
  {
    path: 'profile/:id',
    loadComponent: () =>
      import('./features/profile').then((m) => m.ProfileComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
