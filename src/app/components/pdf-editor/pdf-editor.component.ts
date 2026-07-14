import {
  ChangeDetectionStrategy, Component, HostListener, OnInit,
  computed, inject, signal,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PdfFieldService } from '../../services/pdf-field.service';
import { PdfViewerService } from '../../services/pdf-viewer.service';
import { PdfApiService } from '../../services/pdf-api.service';
import { UndoRedoService } from '../../services/undo-redo.service';
import { PdfViewerComponent, DropOnViewerEvent } from '../pdf-viewer/pdf-viewer.component';
import { FieldToolbarComponent } from '../field-toolbar/field-toolbar.component';
import { FieldPropertiesComponent } from '../field-properties/field-properties.component';
import { PlacedField } from '../../models/placed-field';

/**
 * PdfEditorComponent — main layout shell (activated by /editor and /editor/:id).
 *
 * Layout:
 *   ┌───────────────────────────────────────────── ┐
 *   │              Header bar                      │
 *   ├──────────┬──────────────────────┬────────────┤
 *   │ Toolbar  │   PDF Viewer         │ Properties │
 *   │ (left)   │   + Field Overlay    │  (right)   │
 *   │          │   (center)           │            │
 *   ├──────────┴──────────────────────┴────────────┤
 *   │              Status bar                      │
 *   └─────────────────────────────────────────────┘
 *   Two stages, driven by whether the loaded PDF has already been generated:
 *   - Design (generated() === false): drag/drop/resize boxes, Save, Generate.
 *   - Fill   (generated() === true):  the PDF itself has real AcroForm
 *                                     widgets, which ngx-extended-pdf-viewer
 *                                     renders natively and lets the user type
 *                                     into directly. We just read those values
 *                                     back out via [formData]/(formDataChange)
 *                                     — no custom overlay needed.

 */
@Component({
  selector: 'app-pdf-editor',
  standalone: true,
  imports: [NgFor, NgIf, PdfViewerComponent, FieldToolbarComponent, FieldPropertiesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="root">

      <!-- ── Header ── -->
      <header class="hdr">
        <div class="hdr-left">
          <span class="logo">📄</span>
          <h1 class="app-name">PDF Template Editor</h1>
          <span *ngIf="docName()" class="doc-name">— {{ docName() }}</span>
        </div>

        <div class="hdr-mid" *ngIf="!generated()">
          <button class="icon-btn" [disabled]="!undoRedo.canUndo()" (click)="fieldSvc.undo()" title="Undo (Ctrl+Z)">↩</button>
          <button class="icon-btn" [disabled]="!undoRedo.canRedo()" (click)="fieldSvc.redo()" title="Redo (Ctrl+Y)">↪</button>
          <div class="sep"></div>
          <button class="icon-btn" (click)="viewerSvc.zoomOut()" title="Zoom Out">−</button>
          <span class="zoom-lbl">{{ viewerSvc.zoomPercent() }}%</span>
          <button class="icon-btn" (click)="viewerSvc.zoomIn()" title="Zoom In">+</button>
          <div class="sep"></div>
          <span class="pg-lbl">Page {{ viewerSvc.currentPage() }} / {{ viewerSvc.totalPages() }}</span>
        </div>

        <div class="hdr-right">
          <ng-container *ngIf="!generated()">
            <button class="btn pri" (click)="generate()" [disabled]="generating()">
              {{ generating() ? 'Generating…' : 'Generate PDF' }}
            </button>
          </ng-container>

          <ng-container *ngIf="generated()">
            <button class="btn sec" (click)="backToDesign()">Back to Design</button>
            <button class="btn pri" (click)="onSubmit()" [disabled]="submitting()">
              {{ submitting() ? 'Submitting…' : 'Submit' }}
            </button>
          </ng-container>
        </div>
      </header>

      <!-- ── Three-column body ── -->
      <div class="body">

        <!-- Left panel: field type toolbar (design mode only) -->
        <app-field-toolbar *ngIf="!generated()"></app-field-toolbar>

        <!-- Center: PDF viewer -->
        <main class="viewer-area">
          <div *ngIf="loading()" class="center-msg">Loading document…</div>

          <app-pdf-viewer
            *ngIf="!loading() && hasPdfSource()"
            [pdfSrc]="pdfSrc()"
            [fields]="pageFields()"
            [selectedId]="fieldSvc.selectedId()"
            [zoom]="viewerSvc.zoom()"
            [currentPage]="viewerSvc.currentPage()"
            [showDesignOverlay]="!generated()"
            [formData]="formData()"
            (fieldSelected)="fieldSvc.selectField($event)"
            (fieldDeleted)="fieldSvc.deleteField($event)"
            (fieldMoved)="onMoved($event)"
            (fieldResized)="onResized($event)"
            (fieldDropped)="onDropped($event)"
            (formDataChange)="onFormDataChange($event)"
            (pagesLoaded)="viewerSvc.setTotalPages($event)"
            (pageChanged)="viewerSvc.setCurrentPage($event)"
            (zoomChanged)="viewerSvc.setZoom($event)"
          ></app-pdf-viewer>

          <div *ngIf="!loading() && !hasPdfSource()" class="center-msg">
            <p>No document loaded</p>
            <button class="btn pri mt" (click)="loadDocument(1)">Load Document #1</button>
          </div>
        </main>

        <!-- Right panel: page thumbnails + field properties (design mode only) -->
        <aside class="right" *ngIf="!generated()">
          <div class="thumbs">
            <div
              *ngFor="let p of pageRange()"
              class="thumb"
              [class.active]="viewerSvc.currentPage() === p"
              (click)="viewerSvc.setCurrentPage(p)"
            >
              <span class="thumb-n">{{ p }}</span>
            </div>
          </div>

          <app-field-properties
            [field]="fieldSvc.selectedField()"
            (fieldChange)="onPropChange($event)"
          ></app-field-properties>
        </aside>
      </div>

      <!-- ── Status bar ── -->
      <div *ngIf="status()" class="status" [class.err]="isErr()">{{ status() }}</div>
    </div>
  `,
  styles: [`
    /* Root fills viewport */
    .root { display:flex;flex-direction:column;height:100vh;overflow:hidden;font-family:'Segoe UI',sans-serif; }

    /* Header */
    .hdr { display:flex;align-items:center;justify-content:space-between;height:52px;padding:0 14px;background:#fff;border-bottom:1px solid #dee2e6;flex-shrink:0;gap:10px; }
    .hdr-left,.hdr-mid,.hdr-right { display:flex;align-items:center;gap:6px; }
    .logo { font-size:20px; }
    .app-name { font-size:15px;font-weight:700;color:#212529;margin:0; }
    .doc-name { font-size:12px;color:#6c757d; }

    /* Icon buttons in header */
    .icon-btn { width:30px;height:30px;border:1px solid #dee2e6;background:#fff;border-radius:4px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;transition:background .1s; }
    .icon-btn:hover:not(:disabled) { background:#f1f3f4; }
    .icon-btn:disabled { opacity:.4;cursor:not-allowed; }
    .sep { width:1px;height:20px;background:#dee2e6;margin:0 2px; }
    .zoom-lbl,.pg-lbl { font-size:12px;color:#495057;min-width:42px;text-align:center;white-space:nowrap; }

    /* Action buttons */
    .btn { padding:6px 14px;border:none;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s; }
    .btn:disabled { opacity:.5;cursor:not-allowed; }
    .sec { background:#e9ecef;color:#343a40; }
    .pri { background:#1a73e8;color:#fff; }
    .sec:hover:not(:disabled) { background:#dee2e6; }
    .pri:hover:not(:disabled) { background:#1557b0; }
    .mt  { margin-top:12px; }

    /* Three-column body */
    .body { display:flex;flex:1;overflow:hidden; }

    /* Center viewer */
    .viewer-area { flex:1 1 auto;min-width:0;overflow:hidden;position:relative;display:flex; }
    .center-msg  { display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;width:100%;color:#6c757d;gap:8px;font-size:14px; }

    /* Right panel */
    .right  { width:220px;display:flex;flex-direction:column;border-left:1px solid #dee2e6;overflow:hidden; }
    .thumbs { display:flex;flex-direction:column;gap:5px;padding:8px;overflow-y:auto;max-height:200px;border-bottom:1px solid #dee2e6; }
    .thumb  { height:72px;background:#e9ecef;border:2px solid transparent;border-radius:4px;cursor:pointer;display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px;transition:border-color .12s; }
    .thumb.active { border-color:#1a73e8; }
    .thumb:hover  { border-color:#adb5bd; }
    .thumb-n { font-size:10px;color:#6c757d; }

    /* Status bar */
    .status { height:26px;background:#e8f5e9;border-top:1px solid #c8e6c9;display:flex;align-items:center;padding:0 14px;font-size:12px;color:#2e7d32; }
    .status.err { background:#fce4ec;border-color:#f8bbd0;color:#c62828; }
  `],
})
export class PdfEditorComponent implements OnInit {
  protected fieldSvc  = inject(PdfFieldService);
  protected viewerSvc = inject(PdfViewerService);
  protected undoRedo  = inject(UndoRedoService);
  private   apiSvc    = inject(PdfApiService);
  private   route     = inject(ActivatedRoute);

  readonly docName    = signal('');
  readonly pdfSrc     = signal<string | Uint8Array | null>(null);
  readonly loading    = signal(false);
  readonly saving     = signal(false);
  readonly generating = signal(false);
  readonly submitting = signal(false);
  readonly status     = signal('');
  readonly isErr      = signal(false);
  readonly generated  = signal(false);
  readonly formData = signal<Record<string, string | number | boolean | string[]>>({});

  private docId = signal<number | null>(null);
  get documentId(): number | null { return this.docId(); }

  readonly pageFields = computed(() =>
    this.fieldSvc.fieldsByPage().get(this.viewerSvc.currentPage()) ?? []
  );

  readonly pageRange = computed(() =>
    Array.from({ length: this.viewerSvc.totalPages() }, (_, i) => i + 1)
  );

  readonly hasPdfSource = computed(() => !!this.pdfSrc());

  ngOnInit(): void {
    // Read optional :id param from the route (e.g. /editor/3)
    // Falls back to document 1 if no param is provided
    const idParam = this.route.snapshot.paramMap.get('id');
    const docId   = idParam ? parseInt(idParam, 10) : 1;
    this.loadDocument(docId);
  }

  loadDocument(id: number): void {
    this.loading.set(true);
    this.apiSvc.loadDocument(id).subscribe({
      next: doc => {
        this.docId.set(doc.documentId);
        this.docName.set(doc.fileName);

        if (doc.pdfBase64) {
          this.pdfSrc.set(this.createPdfBytesFromBase64(doc.pdfBase64));
        } else {
          this.pdfSrc.set(this.createBlankPdfUrl(doc.pageCount || this.inferPageCount(doc.fields)));
        }

        // this.fieldSvc.setFields(doc.fields);
        this.loading.set(false);
        this.toast('Document loaded successfully.');
      },
      error: err => {
        this.loading.set(false);
        this.toast(`Load failed: ${err.message}`, true);
      },
    });
  }

  save(): void {
    const id = this.docId();
    if (!id) return;
    this.saving.set(true);
    this.apiSvc
      .saveFields({ documentId: id, fields: this.fieldSvc.getFieldsForSave() })
      .subscribe({
        next: ()  => { this.saving.set(false); this.toast('Fields saved.'); },
        error: err => { this.saving.set(false); this.toast(`Save failed: ${err.message}`, true); },
      });
  }

  generate(): void {
    const id = this.docId();
    if (!id) return;
    this.save();
    this.generating.set(true);
    this.apiSvc.generatePdf({ documentId: id, fields: this.fieldSvc.getFieldsForSave() }).subscribe({
      next: blob => {
        // Load the generated PDF straight into the viewer — it now has real
        // AcroForm fields, so we switch to fill mode instead of re-fetching.
        this.pdfSrc.set(URL.createObjectURL(blob));
        this.formData.set({});
        this.generated.set(true);
        this.generating.set(false);
        this.toast('PDF generated — fields are now fillable below.');
      },
      error: err => {
        this.generating.set(false);
        this.toast(`Generate failed: ${err.message}`, true);
      },
    });
  }

  backToDesign(): void {
    const id = this.docId();
    if (!id) return;
    this.generated.set(false);
    this.formData.set({});
    this.loadDocument(id); // reloads the original (pre-generate) template
  }

  /**
   * "Submit" button. Reads the live AcroForm values the user typed directly
   * into the rendered PDF (captured via (formDataChange)), maps the PDF field
   * names (`f_<guid>`) back to the plain GUIDs /submit expects, and posts them.
   */
  onSubmit(): void {
    const id = this.docId();
    if (!id) return;

    const values = this.toApiValues(this.formData());
    if (Object.keys(values).length === 0) {
      this.toast('Nothing to submit — fill in at least one field first.', true);
      return;
    }

    this.submitting.set(true);
    this.apiSvc.submit({ documentId: id, values, flatten: true }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `document-${id}-submitted.pdf`,
    });
    a.click();
    URL.revokeObjectURL(url);

        this.pdfSrc.set(URL.createObjectURL(blob));  
        this.formData.set({}); 
        this.submitting.set(false);
        this.toast('Submitted — showing the filled PDF.');
      },
      error: err => {
        this.submitting.set(false);
        this.toast(`Submit failed: ${err.message}`, true);
      },
    });
  }

  /** Every AcroForm edit the user makes directly in the rendered PDF lands here. */
  onFormDataChange(data: Record<string, string | number | boolean | string[]>): void {
    this.formData.set(data);
  }

  /**
   * pdf.js gives us `{ f_<guid>: value }`. /submit expects `{ <guid>: value }`
   * with checkbox/radio "on" states as the exact export-value string (e.g.
   * "Yes"/"On"), not booleans — so booleans get normalized here.
   */
  private toApiValues(data: Record<string, string | number | boolean | string[]>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [rawName, rawValue] of Object.entries(data)) {
      if (!rawName.startsWith('f_')) continue;
      const guid = rawName.slice(2).replace(/_/g, '-');
      out[guid] = this.normalizeValue(rawValue);
    }
    return out;
  }

  private normalizeValue(v: unknown): string {
    if (typeof v === 'boolean') return v ? 'Yes' : 'Off';
    if (v == null) return '';
    return String(v);
  }

  // ── Field event handlers (design mode) ──────────────────

  onDropped(e: DropOnViewerEvent): void {
    this.fieldSvc.addField({
      fieldType:  e.fieldType,
      pageNumber: e.pageNumber,
      x: e.pdfX,
      y: e.pdfY,
    });
  }

  onMoved(e: { id: string; x: number; y: number }): void {
    this.fieldSvc.updateField(e.id, { x: e.x, y: e.y });
  }

  onResized(e: { id: string; width: number; height: number }): void {
    this.fieldSvc.updateField(e.id, { width: e.width, height: e.height });
  }

  onPropChange(changes: Partial<PlacedField>): void {
    const id = this.fieldSvc.selectedId();
    if (id) this.fieldSvc.updateField(id, changes);
  }

  // ── Keyboard shortcuts ──────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.generated()) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const tag  = (document.activeElement as HTMLElement)?.tagName;

    if (ctrl && e.key === 'z' && !e.shiftKey)                        { e.preventDefault(); this.fieldSvc.undo(); }
    if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z')))   { e.preventDefault(); this.fieldSvc.redo(); }
    if (ctrl && e.key === 'c')                                        { this.fieldSvc.copySelected(); }
    if (ctrl && e.key === 'v')                                        { this.fieldSvc.paste(); }
    if (ctrl && e.key === 's')                                        { e.preventDefault(); this.save(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      this.fieldSvc.deleteSelected();
    }
  }

  private toast(msg: string, err = false): void {
    this.status.set(msg);
    this.isErr.set(err);
    setTimeout(() => this.status.set(''), 4000);
  }

  private inferPageCount(fields: PlacedField[]): number {
    return Math.max(1, ...fields.map(field => field.pageNumber || 1));
  }

  private createPdfBytesFromBase64(pdfBase64: string): Uint8Array {
    const cleanBase64 = pdfBase64
      .replace(/^data:application\/pdf;base64,/i, '')
      .replace(/\s/g, '');
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  private createBlankPdfUrl(pageCount: number): string {
    const encoder = new TextEncoder();
    const objects: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, i) => `${3 + i} 0 R`).join(' ')}] /Count ${pageCount} >>`,
    ];

    for (let i = 0; i < pageCount; i++) {
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents ${3 + pageCount + i} 0 R >>`);
    }

    for (let i = 0; i < pageCount; i++) {
      objects.push('<< /Length 0 >>\nstream\n\nendstream');
    }

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    objects.forEach((object, index) => {
      offsets.push(encoder.encode(pdf).length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = encoder.encode(pdf).length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  }
}