export type SourceFile =
  | { kind: "pdf"; base64: string }
  | {
      kind: "image";
      base64: string;
      mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    }
  | { kind: "text"; text: string };

export type ExtractionRequest = {
  system: string;
  instructions: string;
  schema: Record<string, unknown>;
};

/** A model that reads a public document and returns JSON matching `request.schema`. */
export interface ExtractionModel {
  extract(file: SourceFile, request: ExtractionRequest): Promise<unknown>;
}
