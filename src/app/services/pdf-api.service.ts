import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlacedField } from '../models/placed-field';

export interface DocumentDto {
  documentId: number;
  fileName: string;
  pageCount: number;
  pdfBase64?: string;
  fields: PlacedField[];
}

export interface SaveFieldsRequest  { documentId: number; fields: PlacedField[]; }
export interface SaveFieldsResponse { success: boolean; message?: string; }
export interface GenerateRequest    { documentId: number; fields: PlacedField[]; }
export interface SubmitFieldDataRequest {
  documentId: number;
  values: Record<string, string>; // fieldId -> typed value
  flatten?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PdfApiService {
  private readonly base = '/api/document';

  constructor(private http: HttpClient) {}

  loadDocument(id: number): Observable<DocumentDto> {
    return this.http.get<DocumentDto>(`${this.base}/${id}`);
  }

  saveFields(req: SaveFieldsRequest): Observable<SaveFieldsResponse> {
    return this.http.post<SaveFieldsResponse>(`${this.base}/save-fields`, req);
  }

  generatePdf(req: GenerateRequest): Observable<Blob> {
    return this.http.post(`${this.base}/generate`, req, { responseType: 'blob' });
  }

  downloadPdf(documentId: number, fields: PlacedField[]): void {
    this.generatePdf({ documentId, fields }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a   = Object.assign(document.createElement('a'), { href: url, download: `document-${documentId}-filled.pdf` });
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  /** "Submit" button — sends typed field values, gets back the filled PDF. */
  submit(req: SubmitFieldDataRequest): Observable<Blob> {
    return this.http.post(`${this.base}/submit`, req, { responseType: 'blob' });
  }

  downloadSubmittedPdf(documentId: number, values: Record<string, string>, flatten = true): void {
    this.submit({ documentId, values, flatten }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a   = Object.assign(document.createElement('a'), { href: url, download: `document-${documentId}-submitted.pdf` });
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}