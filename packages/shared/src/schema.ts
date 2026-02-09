import { z } from "zod";

export const ModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  system: z.string().min(1, "System is required"),
  faction: z.string().min(1, "Faction is required"),
  manufacturer: z.string().optional(),
  tags: z.array(z.string()).default([]),
  count: z.number().int().min(1).default(1),

  // Status flags
  painted: z.boolean().default(false),
  assembled: z.boolean().default(false),
  primed: z.boolean().default(false),
  based: z.boolean().default(false),
  forSale: z.boolean().default(false),
  retailPrice: z.number().optional(),
  sellPrice: z.number().optional(),

  notes: z.string().optional(),
  images: z
    .array(
      z.union([
        z.string(),
        z.object({
          url: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
        }),
      ]),
    )
    .default([]),

  createdAt: z.string().datetime(),
});

export type Model = z.infer<typeof ModelSchema>;

// Input schema for the form (excludes server-generated fields like id, createdAt)
// Input schema for the form. We make ID and createdAt optional for edits.
export const ModelInputSchema = ModelSchema.extend({
  id: z.string().optional(),
  createdAt: z.string().optional(),
});

export type ModelInput = z.infer<typeof ModelInputSchema>;
