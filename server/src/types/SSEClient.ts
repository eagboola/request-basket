import type { Response } from "express";

export type SSEClientsMap = Map<string, Set<Response>>;