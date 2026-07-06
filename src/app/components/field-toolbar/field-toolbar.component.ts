import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { DraggableFieldDirective } from '../../directives/draggable-field.directive';
import { FieldType, FIELD_TYPE_LABELS } from '../../models/field-type';

interface ToolbarItem { type: FieldType; icon: string; }

@Component({
  selector: 'app-field-toolbar',
  standalone: true,
  imports: [NgFor, DraggableFieldDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="toolbar">
      <p class="toolbar-hint">Drag onto PDF</p>
      <div
        *ngFor="let item of items"
        class="tool-item"
        [appDraggableField]="item.type"
        [title]="getLabel(item.type)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="lbl">{{ getLabel(item.type) }}</span>
      </div>
    </aside>
  `,
  styles: [`
    .toolbar { width:168px;height:100%;background:#f8f9fa;border-right:1px solid #dee2e6;padding:12px 8px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;flex-shrink:0; }
    .toolbar-hint { font-size:10px;color:#adb5bd;text-align:center;margin-bottom:8px; }
    .tool-item { display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border:1px solid #dee2e6;border-radius:6px;cursor:grab;user-select:none;transition:background .12s,border-color .12s; }
    .tool-item:hover { background:#e9ecef;border-color:#adb5bd; }
    .tool-item:active { cursor:grabbing; }
    .icon { font-size:15px;width:18px;text-align:center; }
    .lbl  { font-size:12px;color:#343a40; }
  `],
})
export class FieldToolbarComponent {
  readonly items: ToolbarItem[] = [
    { type: FieldType.Text,      icon: 'T'  },
    { type: FieldType.Signature, icon: '✍' },
    { type: FieldType.Initials,  icon: 'I'  },
    { type: FieldType.Date,      icon: '📅' },
    { type: FieldType.Checkbox,  icon: '☑' },
    { type: FieldType.Radio,     icon: '⦿' },
    { type: FieldType.Dropdown,  icon: '▾'  },
    { type: FieldType.Number,    icon: '#'  },
    { type: FieldType.Stamp,     icon: '🔖' },
  ];
  getLabel(t: FieldType): string { return FIELD_TYPE_LABELS[t]; }
}
