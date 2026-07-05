import type { t as enT } from "./en";

/**
 * Recursively widen the `as const` literal shape of the English dictionary
 * to plain `string` values, so language files can be structurally identical
 * but hold different words.
 */
export type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type Translations = Widen<typeof enT>;