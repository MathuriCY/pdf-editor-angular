export interface PdfCoordinate {
  x: number;
  y: number;
  pageNumber: number;
}

export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface ITextCoordinate {
  llx: number;
  lly: number;
  urx: number;
  ury: number;
  pageNumber: number;
}
