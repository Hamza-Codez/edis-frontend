

// This file is just for type checking and exporting types once we run npm run gen:api
// In the meantime, we export generic shapes for Phase 0
export type ApiError = {
  code: string;
  message: string;
  details: unknown;
};
