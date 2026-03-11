import type { Request } from "express";

/** Create a fake Express Request with the given actor for contract tests. */
export function fakeReq(actor: any): Request {
  return { actor } as unknown as Request;
}
