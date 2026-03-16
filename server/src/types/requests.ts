import type { IncomingHttpHeaders } from "node:http";

export interface RequestData {
  endpoint: string;
  method: string;
  headers: IncomingHttpHeaders;
  body: string;
}
