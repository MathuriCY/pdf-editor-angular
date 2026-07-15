import {
  ChangeDetectionStrategy, Component, EventEmitter, Input,
  NgZone, OnChanges, Output, inject,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ResizableDirective, ResizeEvent } from '../../directives/resizable.directive';
import { PlacedField } from '../../models/placed-field';
import { FIELD_TYPE_LABELS } from '../../models/field-type';
import { PdfFieldService } from '../../services/pdf-field.service';
import { CSS_UNITS } from '../../models/page-info';

@Component({
  selector: 'app-field-overlay',
  standalone: true,
  imports: [NgFor, NgIf, ResizableDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="clickOverlay($event)">

      <div
        *ngFor="let f of fields; trackBy: trackById"
        class="pf"
        [class.sel]="selectedId === f.id"
        [class.req]="f.required"
        [style.left.px]="f.x * zoom * cssUnits"
        [style.top.px]="f.y * zoom * cssUnits"
        [style.width.px]="f.width * zoom * cssUnits"
        [style.height.px]="f.height * zoom * cssUnits"
        [style.transform]="'rotate(' + f.rotation + 'deg)'"
        appResizable
        [handles]="['se','sw','ne','nw']"
        (resized)="onResize(f,$event)"
        (resizeEnd)="onResizeEnd(f,$event)"
        (mousedown)="onDown($event,f)"
        (contextmenu)="onCtx($event,f)"
      >
        <span class="lbl">{{ f.label || getLabel(f) }}</span>
        <button *ngIf="selectedId === f.id" class="del" (click)="del(f,$event)">✕</button>
      </div>

      <div
        *ngIf="ctx"
        class="ctx-menu"
        [style.left.px]="ctx!.x"
        [style.top.px]="ctx!.y"
      >
        <button (click)="ctxAct('copy')">Copy</button>
        <button (click)="ctxAct('paste')">Paste</button>
        <hr/>
        <button (click)="ctxAct('delete')" class="danger">Delete</button>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position:absolute;inset:0;pointer-events:none; }
    .pf { position:absolute;border:2px solid #1a73e8;background:rgba(26,115,232,.08);border-radius:3px;pointer-events:all;cursor:move;display:flex;align-items:center;justify-content:center;box-sizing:border-box;user-select:none; }
    .pf.sel { border-color:#d93025;background:rgba(217,48,37,.09);z-index:5; }
    .pf.req::after { content:'*';position:absolute;top:-8px;right:2px;color:#d93025;font-size:13px;font-weight:700; }
    .lbl { font-size:10px;color:#1a73e8;pointer-events:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px; }
    .del { position:absolute;top:-10px;right:-10px;width:20px;height:20px;background:#d93025;color:#fff;border:none;border-radius:50%;font-size:10px;cursor:pointer;pointer-events:all;display:flex;align-items:center;justify-content:center; }
    .ctx-menu { position:absolute;background:#fff;border:1px solid #dee2e6;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.15);z-index:100;pointer-events:all;display:flex;flex-direction:column;min-width:110px; }
    .ctx-menu button { padding:7px 14px;border:none;background:none;cursor:pointer;text-align:left;font-size:13px; }
    .ctx-menu button:hover { background:#f1f3f4; }
    .ctx-menu button.danger { color:#d93025; }
    .ctx-menu hr { margin:2px 0;border:none;border-top:1px solid #dee2e6; }
  `],
})
export class FieldOverlayComponent implements OnChanges {
  readonly cssUnits = CSS_UNITS; 
  @Input() fields:     PlacedField[] = [];
  @Input() selectedId: string | null  = null;
  @Input() zoom = 1;

  @Output() fieldSelected = new EventEmitter<string | null>();
  @Output() fieldDeleted  = new EventEmitter<string>();
  @Output() fieldMoved    = new EventEmitter<{ id: string; x: number; y: number }>();
  @Output() fieldResized  = new EventEmitter<{ id: string; width: number; height: number }>();

  ctx: { x: number; y: number; fieldId: string } | null = null;

  private fieldSvc = inject(PdfFieldService);
  private zone     = inject(NgZone);

  ngOnChanges(): void {}

  trackById(_: number, f: PlacedField): string { return f.id; }

  getLabel(f: PlacedField): string { return FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType; }

  clickOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      this.fieldSelected.emit(null); this.ctx = null;
    }
  }

  onDown(e: MouseEvent, f: PlacedField): void {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    this.fieldSelected.emit(f.id); this.ctx = null;
    const sx = e.clientX, sy = e.clientY, ox = f.x, oy = f.y;
    const mv = (ev: MouseEvent) => this.zone.run(() =>
    this.fieldMoved.emit({
        id: f.id,
        x: ox + (ev.clientX - sx) / (this.zoom * CSS_UNITS),
        y: oy + (ev.clientY - sy) / (this.zoom * CSS_UNITS)
      })
    );
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    this.zone.runOutsideAngular(() => { document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); });
  }

  del(f: PlacedField, e: MouseEvent): void { e.stopPropagation(); this.fieldDeleted.emit(f.id); }

  onResize(f: PlacedField, ev: ResizeEvent): void {
  this.fieldResized.emit({ id: f.id, width: ev.width / (this.zoom * CSS_UNITS), height: ev.height / (this.zoom * CSS_UNITS) });
  }
  onResizeEnd(f: PlacedField, ev: ResizeEvent): void {
    this.fieldResized.emit({ id: f.id, width: ev.width / (this.zoom * CSS_UNITS), height: ev.height / (this.zoom * CSS_UNITS) });
  }

  onCtx(e: MouseEvent, f: PlacedField): void {
    e.preventDefault();
    this.ctx = { x: e.offsetX, y: e.offsetY, fieldId: f.id };
    this.fieldSelected.emit(f.id);
  }

  ctxAct(action: 'copy' | 'paste' | 'delete'): void {
    const id = this.ctx?.fieldId ?? null; this.ctx = null;
    if (!id) return;
    if (action === 'copy')   { this.fieldSvc.selectField(id); this.fieldSvc.copySelected(); }
    if (action === 'paste')  { this.fieldSvc.paste(); }
    if (action === 'delete') { this.fieldDeleted.emit(id); }
  }
}
