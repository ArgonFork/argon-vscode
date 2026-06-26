export interface PropertyMap {
  [key: string]: unknown;
}

export interface PropDescriptor {
  type: string;
  enumType?: string | null;
  category?: string | null;
  deprecated?: string | null;
  writable?: boolean;
  contentType?: string | null;
  permits?: Record<string, string | null>;
}

export interface ReflectionCatalog {
  enums: Record<string, string[]>;
  properties: Record<string, PropDescriptor>;
  overrides: Record<string, Record<string, PropDescriptor>>;
  classes: Record<string, string[]>;
  superclasses: Record<string, string>;
}

export interface PropSpec {
  type: string;
  enumType?: string;
  fqKey?: string;
}

export interface UpdateMessage {
  type: "update";
  instanceName: string;
  className: string;
  props: PropertyMap;
  iconUri: string | null;
  catalog: ReflectionCatalog | undefined;
}

export interface ClearMessage {
  type: "clear";
}

export type ExtensionMessage = UpdateMessage | ClearMessage;
