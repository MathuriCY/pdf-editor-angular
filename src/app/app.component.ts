import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root shell — owns only the router outlet.
 * All layout (header, panels, status bar) lives inside PdfEditorComponent,
 * which is lazy-loaded when the /editor route activates.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }
  `],
})
export class AppComponent {}
