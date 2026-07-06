import { Injectable, signal, computed } from '@angular/core';
import { PlacedField } from '../models/placed-field';

interface Snapshot { fields: PlacedField[]; }

@Injectable({ providedIn: 'root' })
export class UndoRedoService {
  private history = signal<Snapshot[]>([]);
  private pointer = signal<number>(-1);

  readonly canUndo = computed(() => this.pointer() > 0);
  readonly canRedo = computed(() => this.pointer() < this.history().length - 1);

  push(fields: PlacedField[]): void {
    const snap: Snapshot = { fields: structuredClone(fields) };
    this.history.update(h => [...h.slice(0, this.pointer() + 1), snap]);
    this.pointer.update(p => p + 1);
  }

  undo(): PlacedField[] | null {
    if (!this.canUndo()) return null;
    this.pointer.update(p => p - 1);
    return structuredClone(this.history()[this.pointer()].fields);
  }

  redo(): PlacedField[] | null {
    if (!this.canRedo()) return null;
    this.pointer.update(p => p + 1);
    return structuredClone(this.history()[this.pointer()].fields);
  }

  clear(): void { this.history.set([]); this.pointer.set(-1); }
}
