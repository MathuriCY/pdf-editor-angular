import { Directive, ElementRef, HostListener, Input, OnChanges } from '@angular/core';
import { FieldType } from '../models/field-type';

@Directive({ selector: '[appDraggableField]', standalone: true })
export class DraggableFieldDirective implements OnChanges {
  @Input('appDraggableField') fieldType!: FieldType;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(): void {
    this.el.nativeElement.draggable = true;
  }

  @HostListener('dragstart', ['$event'])
  onDragStart(e: DragEvent): void {
    e.dataTransfer?.setData('fieldType', this.fieldType);
    e.dataTransfer?.setData('text/plain', this.fieldType);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
  }

  @HostListener('dragend')
  onDragEnd(): void {
    this.el.nativeElement.blur();
  }
}
