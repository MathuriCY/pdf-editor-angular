import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',redirectTo: 'editor',pathMatch: 'full',
  },
  {
    path: 'editor',
    loadComponent: () =>import('./components/pdf-editor/pdf-editor.component').then(m => m.PdfEditorComponent),
    title: 'PDF Template Editor',
  },
  {
    path: 'editor/:id',
    loadComponent: () =>import('./components/pdf-editor/pdf-editor.component').then(m => m.PdfEditorComponent),
    title: 'PDF Template Editor',
  },
  {
    path: '**',redirectTo: 'editor',
  },
];
