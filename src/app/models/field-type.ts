export enum FieldType {
  Text      = 'text',
  Signature = 'signature',
  Initials  = 'initials',
  Checkbox  = 'checkbox',
  Radio     = 'radio',
  Dropdown  = 'dropdown',
  Date      = 'date',
  Stamp     = 'stamp',
  Number    = 'number',
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  [FieldType.Text]:      'Text',
  [FieldType.Signature]: 'Signature',
  [FieldType.Initials]:  'Initials',
  [FieldType.Checkbox]:  'Checkbox',
  [FieldType.Radio]:     'Radio',
  [FieldType.Dropdown]:  'Dropdown',
  [FieldType.Date]:      'Date',
  [FieldType.Stamp]:     'Stamp',
  [FieldType.Number]:    'Number',
};

export const FIELD_DEFAULT_SIZES: Record<FieldType, { width: number; height: number }> = {
  [FieldType.Text]:      { width: 160, height: 36 },
  [FieldType.Signature]: { width: 200, height: 60 },
  [FieldType.Initials]:  { width: 80,  height: 40 },
  [FieldType.Checkbox]:  { width: 20,  height: 20 },
  [FieldType.Radio]:     { width: 20,  height: 20 },
  [FieldType.Dropdown]:  { width: 160, height: 36 },
  [FieldType.Date]:      { width: 120, height: 36 },
  [FieldType.Stamp]:     { width: 120, height: 60 },
  [FieldType.Number]:    { width: 100, height: 36 },
};
