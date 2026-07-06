import { Injectable, signal, computed } from '@angular/core';
import { PlacedField } from '../models/placed-field';
import { FieldType, FIELD_DEFAULT_SIZES } from '../models/field-type';
import { UndoRedoService } from './undo-redo.service';

@Injectable({ providedIn: 'root' })
export class PdfFieldService {
  private _fields     = signal<PlacedField[]>([]);
  private _selectedId = signal<string | null>(null);
  private _clipboard  = signal<PlacedField | null>(null);

  readonly fields      = this._fields.asReadonly();
  readonly selectedId  = this._selectedId.asReadonly();

  readonly selectedField = computed(() =>
    this._fields().find(f => f.id === this._selectedId()) ?? null
  );

  readonly fieldsByPage = computed(() => {
    const map = new Map<number, PlacedField[]>();
    for (const f of this._fields()) {
      const arr = map.get(f.pageNumber) ?? [];
      arr.push(f);
      map.set(f.pageNumber, arr);
    }
    return map;
  });

  constructor(private undoRedo: UndoRedoService) {}

  private snapshot(): void { this.undoRedo.push(this._fields()); }

  addField(partial: Partial<PlacedField> & { fieldType: FieldType; pageNumber: number }): PlacedField {
    const defaults = FIELD_DEFAULT_SIZES[partial.fieldType];
    const field: PlacedField = {
      id:           crypto.randomUUID(),
      fieldType:    partial.fieldType,
      pageNumber:   partial.pageNumber,
      x:            partial.x ?? 50,
      y:            partial.y ?? 50,
      width:        partial.width  ?? defaults.width,
      height:       partial.height ?? defaults.height,
      rotation:     partial.rotation ?? 0,
      required:     partial.required ?? false,
      defaultValue: partial.defaultValue,
      assignedTo:   partial.assignedTo,
      label:        partial.label ?? partial.fieldType,
      fontSize:     partial.fontSize ?? 12,
      fontFamily:   partial.fontFamily ?? 'Helvetica',
      color:        partial.color ?? '#000000',
      options:      partial.options,
    };
    this.snapshot();
    this._fields.update(fs => [...fs, field]);
    this._selectedId.set(field.id);
    return field;
  }

  updateField(id: string, changes: Partial<PlacedField>): void {
    this.snapshot();
    this._fields.update(fs => fs.map(f => f.id === id ? { ...f, ...changes } : f));
  }

  deleteField(id: string): void {
    this.snapshot();
    this._fields.update(fs => fs.filter(f => f.id !== id));
    if (this._selectedId() === id) this._selectedId.set(null);
  }

  deleteSelected(): void { const id = this._selectedId(); if (id) this.deleteField(id); }

  selectField(id: string | null): void { this._selectedId.set(id); }

  copySelected(): void {
    const f = this.selectedField();
    if (f) this._clipboard.set(structuredClone(f));
  }

  paste(): void {
    const src = this._clipboard();
    if (!src) return;
    this.addField({ ...src, x: src.x + 12, y: src.y + 12 });
  }

  setFields(fields: PlacedField[]): void {
    this._fields.set(fields);
    this.undoRedo.clear();
    this.undoRedo.push(fields);
  }

  undo(): void { const f = this.undoRedo.undo(); if (f) this._fields.set(f); }
  redo(): void { const f = this.undoRedo.redo(); if (f) this._fields.set(f); }

  getFieldsForSave(): PlacedField[] { return structuredClone(this._fields()); }
}
