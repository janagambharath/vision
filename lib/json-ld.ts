const JSON_LD_ESCAPE_MAP: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const UNSAFE_JSON_LD_CHARACTERS = /[<>&\u2028\u2029]/g;

/**
 * Serializes structured data for an inline JSON-LD script without allowing
 * data from the catalog to terminate the script element.
 */
export function serializeJsonLd(value: unknown): string {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new TypeError("JSON-LD data must be JSON serializable");
  }

  return serialized.replace(
    UNSAFE_JSON_LD_CHARACTERS,
    (character) => JSON_LD_ESCAPE_MAP[character]
  );
}
