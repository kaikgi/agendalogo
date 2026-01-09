/**
 * Single source of truth for public booking URL generation.
 * Used by both Sidebar and Configurações.
 */

// Production base URL - the canonical domain for public links
export const PUBLIC_BASE_URL = 'https://agendalogo.lovable.app';

/**
 * Generates the public booking URL for an establishment.
 * @param slug - The establishment's unique slug
 * @returns The full public URL for the establishment's booking page
 */
export function getPublicUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/${slug}`;
}

/**
 * Generates the appointment management URL.
 * @param slug - The establishment's unique slug
 * @param token - The management token
 * @returns The full URL for managing the appointment
 */
export function getManageAppointmentUrl(slug: string, token: string): string {
  return `${PUBLIC_BASE_URL}/${slug}/gerenciar/${token}`;
}
