import { z } from "zod";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm")
  .describe("HH:mm, 24-hour, local Ecuador time");

export const extractedOutageSchema = z.object({
  service: z.enum(["luz", "agua"]),
  zoneNames: z.array(z.string().trim().min(1)),
  barrioNames: z.array(z.string().trim().min(1)),
  date: z.iso.date(),
  start: time,
  end: time.nullable(),
  endsNextDay: z.boolean(),
  notes: z.string().nullable(),
});

export const extractionSchema = z.object({
  outages: z.array(extractedOutageSchema),
});

export type ExtractedOutage = z.infer<typeof extractedOutageSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
