import { z } from "zod";

/**
 * Converts a Zod SafeParseReturnType to a flat Record<string, string> of field errors.
 * The first error per field path is kept. Top-level refinement errors use the path
 * provided in the issue; issues without a path fall back to "algemeen".
 */
type SafeParseResult =
  | { success: true }
  | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };

export function zodErrors(result: SafeParseResult): Record<string, string> {
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0]?.toString() ?? "algemeen";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Auth forms
// ---------------------------------------------------------------------------

/**
 * Login form – email + password (password only checked for presence; strength
 * is irrelevant when logging in).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mailadres is verplicht")
    .email("Voer een geldig e-mailadres in"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

/**
 * Forgot-password form – just needs a valid email address.
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "E-mailadres is verplicht")
    .email("Voer een geldig e-mailadres in"),
});

/**
 * Password-reset / invite-activation form – password strength + confirmation.
 * Rules: at least 8 characters, at least 1 digit, passwords must match.
 */
export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Wachtwoord moet minimaal 8 tekens zijn")
      .regex(/\d/, "Wachtwoord moet minimaal 1 cijfer bevatten"),
    confirmPassword: z.string().min(1, "Bevestig je wachtwoord"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

/**
 * Club info form (onboarding step 1).
 * - naam: required, ≥ 2 chars
 * - postcode: optional; when provided must be Dutch format (1234AB)
 * - email: optional; when provided must be a valid email address
 */
export const clubSchema = z.object({
  naam: z.string().min(2, "Clubnaam moet minimaal 2 karakters bevatten"),
  adres: z.string().optional(),
  postcode: z
    .string()
    .refine(
      (v) => v === "" || /^\d{4}[A-Z]{2}$/i.test(v),
      "Voer een geldige Nederlandse postcode in (bijv. 1234AB)"
    )
    .optional()
    .or(z.literal("")),
  stad: z.string().optional(),
  telefoon: z.string().optional(),
  email: z
    .string()
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Voer een geldig e-mailadres in"
    )
    .optional()
    .or(z.literal("")),
});

/**
 * Competition form (onboarding step 3).
 * - naam: required
 * - speeldag: required (always has a value from the dropdown)
 * - start_datum: required; must be today or in the future
 * - eind_datum: required; must be after start_datum; competition must last ≥ 4 weeks
 */
export const competitionSchema = z
  .object({
    naam: z.string().min(1, "Vul een naam in voor de competitie"),
    speeldag: z.string(),
    start_datum: z
      .string()
      .min(1, "Selecteer een startdatum")
      .refine(
        (d) => d >= new Date().toISOString().split("T")[0],
        "De startdatum moet in de toekomst liggen"
      ),
    eind_datum: z.string().min(1, "Selecteer een einddatum"),
  })
  .superRefine((data, ctx) => {
    if (!data.start_datum || !data.eind_datum) return;
    if (data.eind_datum <= data.start_datum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "De einddatum moet na de startdatum liggen",
        path: ["eind_datum"],
      });
      return;
    }
    const diffDays =
      (new Date(data.eind_datum).getTime() -
        new Date(data.start_datum).getTime()) /
      (1000 * 60 * 60 * 24);
    if (diffDays < 28) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "De competitie moet minimaal 4 weken duren",
        path: ["eind_datum"],
      });
    }
  });

// ---------------------------------------------------------------------------
// Superadmin
// ---------------------------------------------------------------------------

const RESERVED_SLUGS = ["admin", "api", "display", "www", "mail", "app", "static"];

/**
 * New club form (superadmin).
 * - naam: required
 * - slug: 3–30 lowercase alphanumeric + hyphens, not in reserved list
 * - contactEmail: optional; when provided must be a valid email
 */
export const newClubSchema = z.object({
  naam: z.string().min(1, "Verenigingsnaam is verplicht"),
  slug: z
    .string()
    .min(3, "Slug moet minimaal 3 tekens zijn")
    .max(30, "Slug mag maximaal 30 tekens zijn")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug mag alleen kleine letters, cijfers en koppeltekens bevatten"
    )
    .refine((s) => !RESERVED_SLUGS.includes(s), "Deze slug is gereserveerd"),
  contactEmail: z
    .string()
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Voer een geldig e-mailadres in"
    )
    .optional()
    .or(z.literal("")),
});

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/**
 * Invite user form – just needs a valid email address.
 */
export const inviteUserSchema = z.object({
  email: z
    .string()
    .min(1, "E-mailadres is verplicht")
    .email("Voer een geldig e-mailadres in"),
});
