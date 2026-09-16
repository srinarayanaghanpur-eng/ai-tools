export function ok<T>(res: any, data: T, meta?: Record<string, unknown>) {
  return res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: any, data: T) {
  return res.status(201).json({ success: true, data });
}

export function paginated<T>(res: any, data: T[], page: number, limit: number, total: number) {
  return res.status(200).json({
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}
