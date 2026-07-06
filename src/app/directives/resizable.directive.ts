import { Directive, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, Renderer2 } from '@angular/core';

export interface ResizeEvent { width: number; height: number; }
export type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w';

@Directive({ selector: '[appResizable]', standalone: true })
export class ResizableDirective implements OnInit, OnChanges, OnDestroy {
  @Input() minWidth  = 30;
  @Input() minHeight = 20;
  @Input() handles: ResizeHandle[] = ['se'];
  @Output() resized    = new EventEmitter<ResizeEvent>();
  @Output() resizeEnd  = new EventEmitter<ResizeEvent>();

  private handleEls: HTMLElement[] = [];
  private listeners: Array<() => void> = [];

  constructor(private el: ElementRef<HTMLElement>, private r2: Renderer2, private zone: NgZone) {}

  ngOnInit(): void  { this.build(); }
  ngOnChanges(): void { this.destroy(); this.build(); }

  private POSITIONS: Record<ResizeHandle, Partial<CSSStyleDeclaration>> = {
    se: { bottom: '-5px', right: '-5px' },
    sw: { bottom: '-5px', left:  '-5px' },
    ne: { top:    '-5px', right: '-5px' },
    nw: { top:    '-5px', left:  '-5px' },
    n:  { top:    '-5px', left:  '50%', transform: 'translateX(-50%)' },
    s:  { bottom: '-5px', left:  '50%', transform: 'translateX(-50%)' },
    e:  { top:    '50%',  right: '-5px', transform: 'translateY(-50%)' },
    w:  { top:    '50%',  left:  '-5px', transform: 'translateY(-50%)' },
  };

  private build(): void {
    for (const h of this.handles) {
      const el = this.r2.createElement('div') as HTMLElement;
      Object.assign(el.style, {
        position: 'absolute', width: '10px', height: '10px',
        background: '#1a73e8', borderRadius: '2px', zIndex: '10', cursor: `${h}-resize`,
        ...this.POSITIONS[h],
      });
      this.el.nativeElement.appendChild(el);
      this.handleEls.push(el);
      const off = this.r2.listen(el, 'mousedown', (e: MouseEvent) => {
        e.preventDefault(); e.stopPropagation(); this.startResize(e, h);
      });
      this.listeners.push(off);
    }
  }

  private startResize(start: MouseEvent, handle: ResizeHandle): void {
    const host  = this.el.nativeElement;
    const sw    = host.offsetWidth;
    const sh    = host.offsetHeight;
    const sx    = start.clientX;
    const sy    = start.clientY;

    const calc  = (e: MouseEvent) => {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const w  = Math.max(this.minWidth,  sw + (handle.includes('e') ? dx : handle.includes('w') ? -dx : 0));
      const h  = Math.max(this.minHeight, sh + (handle.includes('s') ? dy : handle.includes('n') ? -dy : 0));
      return { width: w, height: h };
    };

    const onMove = (e: MouseEvent) => this.zone.run(() => this.resized.emit(calc(e)));
    const onUp   = (e: MouseEvent) => {
      this.zone.run(() => this.resizeEnd.emit(calc(e)));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    this.zone.runOutsideAngular(() => {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  private destroy(): void {
    this.handleEls.forEach(e => e.remove());
    this.listeners.forEach(fn => fn());
    this.handleEls = [];
    this.listeners = [];
  }

  ngOnDestroy(): void { this.destroy(); }
}
