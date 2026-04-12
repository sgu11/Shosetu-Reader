import { z } from "zod";
import { parseNcode } from "../domain/ncode";

/**
 * Registration input — accepts a Syosetu URL or bare ncode.
 * The transform extracts and normalizes the ncode.
 */
export const registerNovelInputSchema = z
  .object({
    input: z
      .string()
      .min(1, "URL or ncode is required")
      .max(500, "Input too long"),
  })
  .transform((data, ctx) => {
    const ncode = parseNcode(data.input);
    if (!ncode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Could not resolve a valid Syosetu ncode. Provide a URL like https://ncode.syosetu.com/n1234ab/ or a bare ncode like n1234ab.",
        path: ["input"],
      });
      return z.NEVER;
    }
    return { ncode };
  });

export type RegisterNovelInput = z.output<typeof registerNovelInputSchema>;
