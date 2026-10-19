import { extractionSchema, type Extraction } from "../domain/schema.js";
import { toOutputSchema } from "./json-schema.js";
import type { ExtractionModel, SourceFile } from "./ports.js";
import {
  SYSTEM_PROMPT,
  directRequestInstructions,
  tableExtractionSchema,
  tableRequestInstructions,
} from "./prompts.js";

const TABLE_SCHEMA = toOutputSchema(tableExtractionSchema);
const DIRECT_SCHEMA = toOutputSchema(extractionSchema);

/** Runs the two independent extractions of §5.1 in parallel and validates both. */
export async function extractDocument(
  file: SourceFile,
  model: ExtractionModel,
  receivedDate: string,
): Promise<{ primary: Extraction; secondary: Extraction }> {
  const [table, direct] = await Promise.all([
    model.extract(file, {
      system: SYSTEM_PROMPT,
      instructions: tableRequestInstructions(receivedDate),
      schema: TABLE_SCHEMA,
    }),
    model.extract(file, {
      system: SYSTEM_PROMPT,
      instructions: directRequestInstructions(receivedDate),
      schema: DIRECT_SCHEMA,
    }),
  ]);
  return {
    primary: { outages: tableExtractionSchema.parse(table).outages },
    secondary: extractionSchema.parse(direct),
  };
}
