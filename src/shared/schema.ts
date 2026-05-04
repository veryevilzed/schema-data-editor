export type ID = string | number;

export type IdStrategy = 'uuid' | 'auto-increment';

export type StorageFormat = 'single-json' | 'file-per-collection' | 'file-per-doc';

export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'relation'
  | 'file'
  | 'image';

export type RelationKind = 'one' | 'many';

export type AttachmentStorage = 'inline' | 'external';

export type ThumbnailSize = 's' | 'm' | 'b';

export interface BaseField {
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  description?: string;
  showInList?: boolean;
}

export interface StringField extends BaseField {
  type: 'string';
  default?: string;
}

export interface TextField extends BaseField {
  type: 'text';
  default?: string;
}

export interface NumberField extends BaseField {
  type: 'number';
  default?: number;
}

export interface BooleanField extends BaseField {
  type: 'boolean';
  default?: boolean;
}

export interface DateField extends BaseField {
  type: 'date';
  default?: string;
  defaultNow?: boolean;
}

export interface DatetimeField extends BaseField {
  type: 'datetime';
  default?: string;
  defaultNow?: boolean;
}

export interface EnumField extends BaseField {
  type: 'enum';
  values: string[];
  default?: string;
}

export interface RelationField extends BaseField {
  type: 'relation';
  target: string;
  kind: RelationKind;
  default?: ID | ID[];
}

export interface FileField extends BaseField {
  type: 'file';
  storage: AttachmentStorage;
  acceptMime?: string;
}

export interface ImageField extends BaseField {
  type: 'image';
  storage: AttachmentStorage;
  thumbnailSize?: ThumbnailSize;
  acceptMime?: string;
}

export type Field =
  | StringField
  | TextField
  | NumberField
  | BooleanField
  | DateField
  | DatetimeField
  | EnumField
  | RelationField
  | FileField
  | ImageField;

export interface AttachmentValue {
  name: string;
  size: number;
  mime: string;
  data?: string;
  path?: string;
  pending?: boolean;
}

export interface Entity {
  name: string;
  idStrategy: IdStrategy;
  displayField?: string;
  fields: Record<string, Field>;
  fieldOrder: string[];
  nextId?: number;
}

export interface Schema {
  version: 1;
  storage: {
    format: StorageFormat;
    dataDir: string;
  };
  defaultIdStrategy: IdStrategy;
  entities: Record<string, Entity>;
  entityOrder: string[];
}

export type DocumentValue =
  | string
  | number
  | boolean
  | null
  | ID
  | ID[]
  | AttachmentValue
  | undefined;

export interface AppDocument {
  id: ID;
  [key: string]: DocumentValue;
}

export type DataMap = Record<string, AppDocument[]>;

export interface ProjectSnapshot {
  projectPath: string;
  schema: Schema;
  data: DataMap;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  string: 'Строка',
  text: 'Текст (длинный)',
  number: 'Число',
  boolean: 'Булево',
  date: 'Дата',
  datetime: 'Дата и время',
  enum: 'Перечисление',
  relation: 'Связь',
  file: 'Файл',
  image: 'Изображение',
};

export function emptySchema(): Schema {
  return {
    version: 1,
    storage: { format: 'single-json', dataDir: 'data' },
    defaultIdStrategy: 'auto-increment',
    entities: {},
    entityOrder: [],
  };
}

export function emptyEntity(name: string, idStrategy: IdStrategy): Entity {
  return {
    name,
    idStrategy,
    fields: {},
    fieldOrder: [],
    nextId: idStrategy === 'auto-increment' ? 1 : undefined,
  };
}

export function defaultFieldFor(type: FieldType): Field {
  switch (type) {
    case 'string':
      return { type: 'string' };
    case 'text':
      return { type: 'text' };
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'date' };
    case 'datetime':
      return { type: 'datetime' };
    case 'enum':
      return { type: 'enum', values: [] };
    case 'relation':
      return { type: 'relation', target: '', kind: 'one' };
    case 'file':
      return { type: 'file', storage: 'external' };
    case 'image':
      return {
        type: 'image',
        storage: 'external',
        thumbnailSize: 'm',
        acceptMime: 'image/*',
      };
  }
}

export function isAttachmentField(field: Field): field is FileField | ImageField {
  return field.type === 'file' || field.type === 'image';
}
