/**
 * Chilean-specific utility functions
 * RUT validation, formatting, and tax document helpers
 */

/**
 * Clean RUT string by removing dots and hyphens
 */
export function cleanRUT(rut: string): string {
  return rut.replace(/[.-]/g, '').toUpperCase();
}

/**
 * Format RUT with standard Chilean format (12.345.678-9)
 */
export function formatRUT(rut: string): string {
  const cleaned = cleanRUT(rut);
  if (cleaned.length < 2) return rut;

  const digits = cleaned.slice(0, -1);
  const verifier = cleaned.slice(-1);

  // Add dots every 3 digits from right to left
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted}-${verifier}`;
}

/**
 * Validate Chilean RUT
 */
export function validateRUT(rut: string): boolean {
  const cleaned = cleanRUT(rut);

  // Check length (minimum 8 characters: 7 digits + 1 verifier)
  if (cleaned.length < 8 || cleaned.length > 9) {
    return false;
  }

  // Extract digits and verifier
  const digits = cleaned.slice(0, -1);
  const verifier = cleaned.slice(-1);

  // Check if digits are numeric
  if (!/^\d+$/.test(digits)) {
    return false;
  }

  // Calculate check digit
  let sum = 0;
  let multiplier = 2;

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const expectedVerifier = remainder === 0 ? '0' : remainder === 1 ? 'K' : String(11 - remainder);

  return verifier === expectedVerifier;
}

/**
 * Generate next folio number for a given document type and tenant
 */
export function generateFolioNumber(lastFolio: string | null, prefix?: string): string {
  const lastNumber = lastFolio ? parseInt(lastFolio.replace(/\D/g, '')) : 0;
  const nextNumber = lastNumber + 1;
  const paddedNumber = nextNumber.toString().padStart(6, '0');

  return prefix ? `${prefix}${paddedNumber}` : paddedNumber;
}

/**
 * Get document code for Chilean tax document types
 */
export function getDocumentCode(type: string): number {
  const codes: Record<string, number> = {
    'BOLETA': 39,
    'FACTURA': 33,
    'NOTA_CREDITO': 61,
    'NOTA_DEBITO': 56,
    'GUIA_DESPACHO': 52,
  };

  return codes[type] || 33; // Default to FACTURA
}

/**
 * Get document type name in Spanish
 */
export function getDocumentTypeName(type: string): string {
  const names: Record<string, string> = {
    'BOLETA': 'Boleta Electrónica',
    'FACTURA': 'Factura Electrónica',
    'NOTA_CREDITO': 'Nota de Crédito Electrónica',
    'NOTA_DEBITO': 'Nota de Débito Electrónica',
    'GUIA_DESPACHO': 'Guía de Despacho Electrónica',
  };

  return names[type] || type;
}

/**
 * Calculate Chilean IVA (VAT) - currently 19%
 */
export function calculateIVA(netAmount: number): number {
  const IVA_RATE = 0.19;
  return Math.round(netAmount * IVA_RATE);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format Chilean currency
 */
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format Chilean date
 */
export function formatChileanDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format Chilean date and time
 */
export function formatChileanDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Validate Chilean phone number
 */
export function validateChileanPhone(phone: string): boolean {
  // Chilean phone numbers: mobile (+56 9 XXXX XXXX) or landline (+56 X XXXX XXXX)
  const phoneRegex = /^(\+56\s?)?[2-9]\d{7,8}$|^(\+56\s?)?9\d{8}$/;
  const cleaned = phone.replace(/[\s-]/g, '');
  return phoneRegex.test(cleaned);
}

/**
 * Format Chilean phone number
 */
export function formatChileanPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\+]/g, '');

  if (cleaned.startsWith('56')) {
    // International format
    const localNumber = cleaned.substring(2);
    if (localNumber.startsWith('9')) {
      // Mobile
      return `+56 9 ${localNumber.substring(1, 5)} ${localNumber.substring(5)}`;
    } else {
      // Landline
      return `+56 ${localNumber.substring(0, 1)} ${localNumber.substring(1, 5)} ${localNumber.substring(5)}`;
    }
  } else if (cleaned.startsWith('9') && cleaned.length === 9) {
    // Mobile without country code
    return `+56 9 ${cleaned.substring(1, 5)} ${cleaned.substring(5)}`;
  } else if (cleaned.length === 8) {
    // Landline without country code
    return `+56 ${cleaned.substring(0, 1)} ${cleaned.substring(1, 5)} ${cleaned.substring(5)}`;
  }

  return phone; // Return original if format is not recognized
}

/**
 * Get RUT number without verifier digit (for OpenFactura API)
 */
export function getRUTNumber(rut: string): number {
  const cleaned = cleanRUT(rut);
  const digits = cleaned.slice(0, -1);
  return parseInt(digits);
}

/**
 * Get RUT verifier digit
 */
export function getRUTVerifier(rut: string): string {
  const cleaned = cleanRUT(rut);
  return cleaned.slice(-1);
}

/**
 * Format RUT for OpenFactura API (with dash, e.g., "12345678-9")
 */
export function formatRUTForAPI(rut: string): string {
  const cleaned = cleanRUT(rut);
  const digits = cleaned.slice(0, -1);
  const verifier = cleaned.slice(-1);
  return `${digits}-${verifier}`;
}