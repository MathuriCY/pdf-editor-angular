import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlacedField } from '../../models/placed-field';
import { FieldType, FIELD_TYPE_LABELS } from '../../models/field-type';

@Component({
  selector: 'app-field-properties',
  standalone: true,
  imports: [NgIf, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="props">
      <h3 class="title">Properties</h3>

      <p *ngIf="!field" class="empty">Select a field to edit.</p>

      <ng-container *ngIf="field">
        <div class="row"><span class="key">Type</span><span class="val">{{ label(field.fieldType) }}</span></div>
        <div class="row"><span class="key">Page</span><span class="val">{{ field.pageNumber }}</span></div>

        <label class="group">
          <span class="key">Label</span>
          <input class="inp" type="text" [ngModel]="field.label" (ngModelChange)="e('label',$event)" />
        </label>

        <label class="group">
          <span class="key">Assigned To</span>
          <input class="inp" type="text" [ngModel]="field.assignedTo" (ngModelChange)="e('assignedTo',$event)" placeholder="Role / name" />
        </label>

        <label class="group">
          <span class="key">Default Value</span>
          <input class="inp" type="text" [ngModel]="field.defaultValue" (ngModelChange)="e('defaultValue',$event)" />
        </label>

        <div class="pair">
          <label class="group">
            <span class="key">X (pt)</span>
            <input class="inp" type="number" [ngModel]="r(field.x)" (ngModelChange)="e('x',+$event)" />
          </label>
          <label class="group">
            <span class="key">Y (pt)</span>
            <input class="inp" type="number" [ngModel]="r(field.y)" (ngModelChange)="e('y',+$event)" />
          </label>
        </div>

        <div class="pair">
          <label class="group">
            <span class="key">Width</span>
            <input class="inp" type="number" [ngModel]="r(field.width)" (ngModelChange)="e('width',+$event)" />
          </label>
          <label class="group">
            <span class="key">Height</span>
            <input class="inp" type="number" [ngModel]="r(field.height)" (ngModelChange)="e('height',+$event)" />
          </label>
        </div>

        <label class="group">
          <span class="key">Rotation (°)</span>
          <input class="inp" type="number" step="5" [ngModel]="field.rotation" (ngModelChange)="e('rotation',+$event)" />
        </label>

        <label class="group">
          <span class="key">Font Size</span>
          <input class="inp" type="number" [ngModel]="field.fontSize ?? 12" (ngModelChange)="e('fontSize',+$event)" />
        </label>

        <label class="group chk">
          <input type="checkbox" [ngModel]="field.required" (ngModelChange)="e('required',$event)" />
          <span class="key">Required</span>
        </label>
      </ng-container>
    </div>
  `,
  styles: [`
    .props { flex:1;background:#f8f9fa;border-top:1px solid #dee2e6;padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px; }
    .title { font-size:12px;font-weight:600;color:#495057;margin-bottom:4px; }
    .empty { font-size:11px;color:#adb5bd; }
    .row   { display:flex;justify-content:space-between;align-items:center; }
    .key   { font-size:11px;color:#6c757d;font-weight:500; }
    .val   { font-size:11px;color:#212529; }
    .group { display:flex;flex-direction:column;gap:2px; }
    .pair  { display:flex;gap:6px; }
    .pair .group { flex:1; }
    .inp   { border:1px solid #ced4da;border-radius:4px;padding:4px 7px;font-size:11px;width:100%;background:#fff;box-sizing:border-box; }
    .inp:focus { outline:none;border-color:#1a73e8; }
    .chk   { flex-direction:row;align-items:center;gap:6px;cursor:pointer; }
  `],
})
export class FieldPropertiesComponent implements OnChanges {
  @Input()  field!: PlacedField | null;
  @Output() fieldChange = new EventEmitter<Partial<PlacedField>>();

  ngOnChanges(): void {}
  label(t: FieldType): string { return FIELD_TYPE_LABELS[t] ?? t; }
  r(v: number): number { return Math.round(v); }
  e(key: keyof PlacedField, value: unknown): void { this.fieldChange.emit({ [key]: value } as Partial<PlacedField>); }
}
