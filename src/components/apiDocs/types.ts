export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiEndpointParameter {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  type: string;
  description: string;
  defaultValue?: string;
  enumValues?: string[];
}

export interface ApiEndpointField {
  name: string;
  type: string;
  required: boolean;
  defaultLabel?: string;
  description: string;
}

export interface ApiEndpointDoc {
  id: string;
  tag: 'Scraper' | 'System';
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  parameters: ApiEndpointParameter[];
  bodyFields?: ApiEndpointField[];
  exampleBody?: string;
  responseCodes: Array<{ status: number; description: string }>;
}