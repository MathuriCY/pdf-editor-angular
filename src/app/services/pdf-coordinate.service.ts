import { Injectable, signal } from '@angular/core';
import { PageInfo } from '../models/page-info';
import { ViewerCoordinate, ViewerRect } from '../models/viewer-coordinate';
import { PdfRect, ITextCoordinate } from '../models/pdf-coordinate';

@Injectable({ providedIn: 'root' })
export class PdfCoordinateService {
  private pageInfoMap = signal<Map<number, PageInfo>>(new Map());

  setPageInfo(info: PageInfo): void {
    this.pageInfoMap.update(map => new Map(map).set(info.pageNumber, info));
  }

  getPageInfo(pageNumber: number): PageInfo | undefined {
    return this.pageInfoMap().get(pageNumber);
  }

  /** Convert viewer pixel coords → PDF user-space (top-left origin, pt) */
  viewerToPdf(pixelX: number, pixelY: number, pageNumber: number): { x: number; y: number } {
    const page = this.getPageInfo(pageNumber);
    if (!page) throw new Error(`PageInfo missing for page ${pageNumber}`);
    return {
      x: pixelX / page.scale,
      y: pixelY / page.scale,
    };
  }

  /** Convert PDF user-space → viewer pixels */
  pdfToViewer(pdfX: number, pdfY: number, pageNumber: number): { x: number; y: number } {
    const page = this.getPageInfo(pageNumber);
    if (!page) throw new Error(`PageInfo missing for page ${pageNumber}`);
    return { x: pdfX * page.scale, y: pdfY * page.scale };
  }

  /** PDF top-left coords → iText bottom-left coords */
  pdfRectToIText(rect: PdfRect): ITextCoordinate {
    const page = this.getPageInfo(rect.pageNumber);
    if (!page) throw new Error(`PageInfo missing for page ${rect.pageNumber}`);
    const lly = page.height - rect.y - rect.height;
    return { llx: rect.x, lly, urx: rect.x + rect.width, ury: lly + rect.height, pageNumber: rect.pageNumber };
  }

  /** iText bottom-left → PDF top-left */
  iTextToPdfRect(c: ITextCoordinate): PdfRect {
    const page = this.getPageInfo(c.pageNumber);
    if (!page) throw new Error(`PageInfo missing for page ${c.pageNumber}`);
    const height = c.ury - c.lly;
    return { x: c.llx, y: page.height - c.ury, width: c.urx - c.llx, height, pageNumber: c.pageNumber };
  }

  snapToGrid(value: number, grid = 8): number {
    return Math.round(value / grid) * grid;
  }

  snapRectToGrid(r: ViewerRect, grid = 8): ViewerRect {
    return { ...r, x: this.snapToGrid(r.x, grid), y: this.snapToGrid(r.y, grid), width: this.snapToGrid(r.width, grid), height: this.snapToGrid(r.height, grid) };
  }
}
