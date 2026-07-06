import { FieldType } from './field-type';

export interface PlacedField {
  id: string;
  fieldType: FieldType;
  pageNumber: number;
  /** PDF user-space X (points, top-left origin) */
  x: number;
  /** PDF user-space Y (points, top-left origin) */
  y: number;
  width: number;
  height: number;
  rotation: number;
  required: boolean;
  defaultValue?: string;
  assignedTo?: string;
  label?: string;
  options?: string[];
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}
