export const databaseCodeMaxLength = 40;

/**
 * Construit une clé compatible avec les colonnes VARCHAR(40) du schéma MySQL.
 *
 * @param {string} prefix
 * @param {string} value
 */
export function makeDatabaseCode(prefix, value) {
  const normalizedPrefix = prefix.trim().toUpperCase().slice(0, databaseCodeMaxLength - 2);
  const maxSlugLength = databaseCodeMaxLength - normalizedPrefix.length - 1;
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxSlugLength)
    .toUpperCase();

  return `${normalizedPrefix}-${slug || "MULCV".slice(0, maxSlugLength)}`;
}
