export const CSS_UNITS = 96 / 72; // pdf.js renders at 1 PDF pt = 1.333 CSS px

export interface PageInfo {
  pageNumber: number;
  /** Rendered pixel width at scale=1 */
  width: number;
  /** Rendered pixel height at scale=1 */
  height: number;
  rotation: number;
  scale: number;
}
