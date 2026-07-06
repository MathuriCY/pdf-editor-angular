import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef,
  EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild, inject,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { NgxExtendedPdfViewerModule, PageRenderedEvent, PagesLoadedEvent } from 'ngx-extended-pdf-viewer';
import { PdfViewerService } from '../../services/pdf-viewer.service';
import { PdfCoordinateService } from '../../services/pdf-coordinate.service';
import { FieldOverlayComponent } from '../field-overlay/field-overlay.component';
import { PlacedField } from '../../models/placed-field';
import { FieldType } from '../../models/field-type';

export interface DropOnViewerEvent {
  fieldType: FieldType;
  pageNumber: number;
  pdfX: number;
  pdfY: number;
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [NgIf, NgxExtendedPdfViewerModule, FieldOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" #wrap (dragover)="$event.preventDefault()" (drop)="onDrop($event)">

      <ngx-extended-pdf-viewer
        *ngIf="pdfSrc"
        [src]="pdfSrc"
        [zoom]="zoomStr"
        [page]="currentPage"
        [showToolbar]="false"
        [showSidebarButton]="false"
        [textLayer]="true"
        [height]="'100%'"
        (pagesLoaded)="onPagesLoaded($event)"
        (pageRendered)="onPageRendered($event)"
        (pageChange)="onPageChange($event)"
        (zoomChange)="onZoomChange($event)"
      ></ngx-extended-pdf-viewer>

      <div
        *ngIf="pageBox"
        class="overlay-layer"
        [style.left.px]="pageBox.left"
        [style.top.px]="pageBox.top"
        [style.width.px]="pageBox.width"
        [style.height.px]="pageBox.height"
      >
        <app-field-overlay
          [fields]="fields"
          [selectedId]="selectedId"
          [zoom]="zoom"
          (fieldSelected)="fieldSelected.emit($event)"
          (fieldDeleted)="fieldDeleted.emit($event)"
          (fieldMoved)="fieldMoved.emit($event)"
          (fieldResized)="fieldResized.emit($event)"
        ></app-field-overlay>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block;flex:1 1 auto;min-width:0;height:100%; }
    .wrap { position:relative;width:100%;height:100%;overflow:auto;background:#525659; }
    .overlay-layer { position:absolute;inset:0;pointer-events:none; }
    ngx-extended-pdf-viewer { display:block;width:100%;height:100%; }
  `],
})
export class PdfViewerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() pdfSrc: string | Uint8Array | null = null;
  @Input() fields:     PlacedField[] = [];
  @Input() selectedId: string | null = null;
  @Input() zoom        = 1;
  @Input() currentPage = 1;

  @Output() fieldSelected = new EventEmitter<string | null>();
  @Output() fieldDeleted  = new EventEmitter<string>();
  @Output() fieldMoved    = new EventEmitter<{ id: string; x: number; y: number }>();
  @Output() fieldResized  = new EventEmitter<{ id: string; width: number; height: number }>();
  @Output() fieldDropped  = new EventEmitter<DropOnViewerEvent>();
  @Output() pagesLoaded   = new EventEmitter<number>();
  @Output() pageChanged   = new EventEmitter<number>();
  @Output() zoomChanged   = new EventEmitter<number>();

  @ViewChild('wrap') wrap!: ElementRef<HTMLElement>;

  pageBox: { left: number; top: number; width: number; height: number } | null = null;

  get zoomStr(): string { return `${Math.round(this.zoom * 100)}%`; }

  private viewerSvc = inject(PdfViewerService);
  private coordSvc  = inject(PdfCoordinateService);

  ngAfterViewInit(): void { this.updatePageBox(); }
  ngOnChanges(): void { this.updatePageBox(); }
  ngOnDestroy(): void {}

  onPagesLoaded(e: PagesLoadedEvent): void {
    this.viewerSvc.setTotalPages(e.pagesCount);
    this.viewerSvc.setLoaded(true);
    this.pagesLoaded.emit(e.pagesCount);
  }

  onPageRendered(e: PageRenderedEvent): void {
    const div = (e.source as { div?: HTMLElement })?.div;
    if (!div) return;
    const rect = div.getBoundingClientRect();
    this.coordSvc.setPageInfo({
      pageNumber: e.pageNumber,
      width:  rect.width  / this.zoom,
      height: rect.height / this.zoom,
      rotation: 0,
      scale: this.zoom,
    });
    this.updatePageBox();
  }

  onPageChange(page: number): void {
    this.viewerSvc.setCurrentPage(page);
    this.updatePageBox(page);
    this.pageChanged.emit(page);
  }

  onZoomChange(zoom: string | number): void {
    const v = typeof zoom === 'number' ? zoom : parseFloat(zoom) / 100;
    this.viewerSvc.setZoom(v);
    queueMicrotask(() => this.updatePageBox());
    this.zoomChanged.emit(v);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const raw = e.dataTransfer?.getData('fieldType');
    if (!raw) return;
    const wRect = this.wrap.nativeElement.getBoundingClientRect();
    const dropX = e.clientX - wRect.left;
    const dropY = e.clientY - wRect.top;
    const page  = this.findPage(dropX, dropY);
    if (!page) return;
    this.fieldDropped.emit({
      fieldType: raw as FieldType,
      pageNumber: page.num,
      pdfX: page.relX / this.zoom,
      pdfY: page.relY / this.zoom,
    });
  }

  private findPage(x: number, y: number): { num: number; relX: number; relY: number } | null {
    const wRect = this.wrap.nativeElement.getBoundingClientRect();
    for (const pg of Array.from(this.wrap.nativeElement.querySelectorAll('.page'))) {
      const r = pg.getBoundingClientRect();
      const l = r.left - wRect.left, t = r.top - wRect.top;
      if (x >= l && x <= l + r.width && y >= t && y <= t + r.height) {
        const num = parseInt((pg as HTMLElement).dataset['pageNumber'] ?? '1', 10);
        return { num, relX: x - l, relY: y - t };
      }
    }
    return null;
  }

  private updatePageBox(pageNumber = this.currentPage): void {
    const wrap = this.wrap?.nativeElement;
    if (!wrap) return;

    const page = wrap.querySelector(`.page[data-page-number="${pageNumber}"]`);
    if (!page) return;

    const wrapRect = wrap.getBoundingClientRect();
    const pageRect = page.getBoundingClientRect();
    this.pageBox = {
      left: pageRect.left - wrapRect.left + wrap.scrollLeft,
      top: pageRect.top - wrapRect.top + wrap.scrollTop,
      width: pageRect.width,
      height: pageRect.height,
    };
  }
}
