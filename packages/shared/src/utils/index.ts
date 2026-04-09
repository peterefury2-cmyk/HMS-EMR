export function generatePatientNo(count: number): string {
  return `P${String(count + 1).padStart(6, '0')}`;
}

export function generateInvoiceNo(count: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `INV-${y}-${String(count + 1).padStart(5, '0')}`;
}

export function generateClaimNo(count: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `CLM-${y}-${String(count + 1).padStart(5, '0')}`;
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages,
  };
}
