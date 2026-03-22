import { z } from "zod";

export const departmentBootstrapSchema = z.object({
  apply: z.boolean().default(true),
});

export type DepartmentBootstrapInput = z.infer<typeof departmentBootstrapSchema>;
