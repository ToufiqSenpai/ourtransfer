import { Route } from '@angular/router'

export const transfersRoutes: Route[] = [
  { path: '', loadComponent: () => import('./pages/transfer/transfer.component').then(m => m.TransferComponent) },
]
