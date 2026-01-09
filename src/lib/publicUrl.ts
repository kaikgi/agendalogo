/**
 * Single source of truth for public URL generation.
 * Used across the entire application.
 * 
 * IMPORTANT: Never use window.location.origin for public links.
 * Always use these functions to ensure links work in production.
 */

// Production base URL - the canonical domain for public links
// This is the ONLY place where the base URL should be defined
export const PUBLIC_BASE_URL = 'https://agendalogo.lovable.app';

/**
 * Returns the public base URL for the application.
 * Use this instead of window.location.origin for any public-facing links.
 */
export function getPublicBaseUrl(): string {
  return PUBLIC_BASE_URL;
}

/**
 * Builds a public URL by appending a path to the base URL.
 * Handles path normalization to avoid double slashes.
 * @param path - The path to append (with or without leading slash)
 * @returns The full public URL
 */
export function buildPublicUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_BASE_URL}${normalizedPath}`;
}

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

/**
 * Generates the professional portal URL.
 * @param establishmentSlug - The establishment's unique slug
 * @param professionalSlug - The professional's unique slug
 * @returns The full public URL for the professional's portal login
 */
export function getProfessionalPortalUrl(establishmentSlug: string, professionalSlug: string): string {
  return `${PUBLIC_BASE_URL}/${establishmentSlug}/p/${professionalSlug}`;
}

/**
 * Generates the client appointments page URL.
 * @returns The full public URL for the client's appointments page
 */
export function getClientAppointmentsUrl(): string {
  return `${PUBLIC_BASE_URL}/client/appointments`;
}
