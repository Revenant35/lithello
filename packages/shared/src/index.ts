export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export const APP_NAME = 'lithello';
