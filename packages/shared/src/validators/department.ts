import { z } from "zod";

export const departmentBootstrapSchema = z.object({
  // No fields needed - bootstrap creates all departments for the company
});

export type DepartmentBootstrapInput = z.infer<typeof departmentBootstrapSchema>;