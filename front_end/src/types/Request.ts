import type { HeadersType } from './HeadersType';

export interface Request {
  method: string,
  headers: HeadersType,
  body: string | {},
}
