import { Directive, ElementRef, HostListener, Input, OnChanges } from '@angular/core';
import { FieldType } from '../models/field-type';

const EMPTY_DRAG_IMAGE = new Image();
EMPTY_DRAG_IMAGE.src =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';

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
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0); 
    }
  }

  @HostListener('dragend')
  onDragEnd(): void {
    this.el.nativeElement.blur();
  }
}
