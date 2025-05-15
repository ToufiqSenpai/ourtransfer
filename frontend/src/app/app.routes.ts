import { Routes } from '@angular/router';
import { authRoutes } from './features/auth/auth.route'
import { transfersRoutes } from './features/transfers/transfers.route'

export const routes: Routes = [
  {
    path: 'auth',
    children: authRoutes
  },
  {
    path: 'transfers',
    children: transfersRoutes
  }
];
