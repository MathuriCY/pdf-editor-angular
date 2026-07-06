import { Injectable, signal, computed } from '@angular/core';
import { PageInfo } from '../models/page-info';

@Injectable({ providedIn: 'root' })
export class PdfViewerService {
  readonly currentPage  = signal<number>(1);
  readonly totalPages   = signal<number>(0);
  readonly zoom         = signal<number>(1.0);
  readonly scrollTop    = signal<number>(0);
  readonly scrollLeft   = signal<number>(0);
  readonly isLoaded     = signal<boolean>(false);
  readonly pageInfoMap  = signal<Map<number, PageInfo>>(new Map());

  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  setCurrentPage(page: number): void  { this.currentPage.set(page); }
  setTotalPages(total: number): void  { this.totalPages.set(total); }
  setLoaded(v: boolean): void         { this.isLoaded.set(v); }

  setZoom(zoom: number): void {
    this.zoom.set(Math.max(0.25, Math.min(4, zoom)));
  }
  zoomIn(step = 0.25): void  { this.setZoom(this.zoom() + step); }
  zoomOut(step = 0.25): void { this.setZoom(this.zoom() - step); }

  updateScroll(top: number, left: number): void {
    this.scrollTop.set(top);
    this.scrollLeft.set(left);
  }

  registerPageInfo(info: PageInfo): void {
    this.pageInfoMap.update(map => new Map(map).set(info.pageNumber, info));
  }

  getPageInfo(pageNumber: number): PageInfo | undefined {
    return this.pageInfoMap().get(pageNumber);
  }
}
