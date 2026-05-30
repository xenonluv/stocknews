// 공개 REST API 응답 표준 포맷 (팀원6 → 외부 클라이언트)

export interface ApiItemResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_ERROR";
    message: string;
  };
}
