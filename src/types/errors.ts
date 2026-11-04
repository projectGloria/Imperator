// Mirrors `AppError` in src-tauri/src/errors.rs (serde tag = "kind", camelCase).
// A discriminated union makes `switch (err.kind)` exhaustiveness-checked.

export type AppError =
  | { kind: "notConfigured"; message: string }
  | { kind: "invalidIp"; message: string }
  | { kind: "accessDenied"; message: string }
  | { kind: "notFound"; message: string }
  | { kind: "rateLimited"; message: string }
  | { kind: "maintenance"; message: string }
  | { kind: "offline"; message: string }
  | { kind: "timeout"; message: string }
  | { kind: "api"; status: number; message: string }
  | { kind: "parse"; message: string }
  | { kind: "io"; message: string };

export type AppErrorKind = AppError["kind"];
