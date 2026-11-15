import { z } from "zod";

/** Estado estándar que devuelven las Server Actions a los formularios. */
export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError): ActionState {
  return { ok: false, error: "Revisa los campos marcados.", fieldErrors: fieldErrors(error) };
}

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} es obligatorio` })
    .trim()
    .min(min, min <= 1 ? `${label} es obligatorio` : `${label} debe tener al menos ${min} caracteres`)
    .max(max, `${label} admite máximo ${max} caracteres`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const emailSchema = z
  .string({ required_error: "El correo es obligatorio" })
  .trim()
  .toLowerCase()
  .email("Correo electrónico no válido")
  .max(160);

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga")
  .regex(/[A-Za-z]/, "Incluye al menos una letra")
  .regex(/\d/, "Incluye al menos un número");

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Teléfono no válido")
  .max(20, "Teléfono no válido")
  .regex(/^[+\d][\d\s()-]+$/, "Teléfono no válido");

export const registerSchema = z
  .object({
    name: trimmed(2, 100, "El nombre"),
    email: emailSchema,
    phone: z.union([phoneSchema, z.literal("")]).optional().transform((v) => (v ? v : null)),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", { errorMap: () => ({ message: "Debes aceptar los términos" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña").max(128),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export const profileSchema = z.object({
  name: trimmed(2, 100, "El nombre"),
  phone: z.union([phoneSchema, z.literal("")]).optional().transform((v) => (v ? v : null)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export const addressFields = {
  fullName: trimmed(2, 120, "El nombre de quien recibe"),
  phone: phoneSchema,
  line1: trimmed(4, 200, "La dirección"),
  line2: optionalTrimmed(200),
  city: trimmed(2, 100, "La ciudad"),
  state: trimmed(2, 100, "El departamento o estado"),
  postalCode: optionalTrimmed(20),
  country: trimmed(2, 80, "El país"),
  notes: optionalTrimmed(300),
};

export const addressSchema = z.object({
  label: optionalTrimmed(40),
  ...addressFields,
  isDefault: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  customerName: trimmed(2, 120, "El nombre"),
  customerPhone: phoneSchema,
  ...addressFields,
  shippingMethodId: z.string().min(1, "Selecciona un método de envío"),
  paymentProvider: z.enum(["STRIPE", "MERCADOPAGO", "BANK_TRANSFER", "CASH_ON_DELIVERY"], {
    errorMap: () => ({ message: "Selecciona un método de pago" }),
  }),
  couponCode: optionalTrimmed(40),
  customerNote: optionalTrimmed(500),
  saveAddress: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "Debes aceptar los términos y condiciones" }) }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
