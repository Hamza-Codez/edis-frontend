/**
 * The contract, re-exported — never redefined.
 *
 * Every shape here comes from lib/schema.d.ts, which `npm run gen:api`
 * regenerates from the backend's OpenAPI document. Declaring any of these by
 * hand disarms the drift alarm: a backend rename would then fail at runtime in
 * front of a user instead of failing the type check within seconds.
 *
 * Never hand-edit lib/schema.d.ts. It is regenerated, and edits vanish.
 */
import type { components } from './schema';

type Schemas = components['schemas'];

// Auth and users
export type LoginRequest = Schemas['LoginRequest'];
export type CurrentUser = Schemas['app__routers__auth__UserResponse'];
export type ManagedUser = Schemas['app__routers__users__UserResponse'];
export type UserCreate = Schemas['UserCreate'];
export type UserUpdate = Schemas['UserUpdate'];

// Documents
export type DocumentResponse = Schemas['DocumentResponse'];
export type DocumentStatus = DocumentResponse['status'];

// Retrieval
export type SearchRequest = Schemas['SearchRequest'];
export type SearchResponse = Schemas['SearchResponse'];
export type SearchResponseChunk = Schemas['SearchResponseChunk'];
export type SearchMode = NonNullable<SearchRequest['mode']>;

// Grounded Q&A
export type AskRequest = Schemas['AskRequest'];
export type AskResponse = Schemas['AskResponse'];
export type AnswerPayload = Schemas['AnswerPayload'];
export type ClaimResponse = Schemas['ClaimResponse'];
export type CitationChunk = Schemas['CitationChunk'];

// Query log
export type QueryResponse = Schemas['QueryResponse'];
export type QueryDetailResponse = Schemas['QueryDetailResponse'];

/** The single error envelope every route maps to, by exception type. */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details: unknown;
  };
};
