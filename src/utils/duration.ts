const isoDurationPattern =
  /^P(?:(?<days>\d+(?:[.,]\d+)?)D)?(?:T(?:(?<hours>\d+(?:[.,]\d+)?)H)?(?:(?<minutes>\d+(?:[.,]\d+)?)M)?(?:(?<seconds>\d+(?:[.,]\d+)?)S)?)?$/i;

export function minutesToIsoDuration(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0 || !Number.isFinite(minutes)) {
    return null;
  }

  const totalSeconds = Math.round(minutes * 60);
  if (!Number.isSafeInteger(totalSeconds) || totalSeconds <= 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const suffix = seconds ? `${seconds}S` : "";
  if (hours > 0) {
    return `PT${hours}H${remainingMinutes}M${suffix}`;
  }
  return `PT${remainingMinutes}M${suffix}`;
}

export function isoDurationToMinutes(duration?: string | null): number | null {
  if (!duration) {
    return null;
  }

  const trimmed = duration.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
    const val = Math.ceil(Number(trimmed.replace(",", ".")));
    return Number.isSafeInteger(val) && val > 0 ? val : null;
  }

  const match = trimmed.match(isoDurationPattern);
  if (match?.groups) {
    const amount = (value?: string) => Number((value ?? "0").replace(",", "."));
    const total = Math.ceil(amount(match.groups.days) * 24 * 60 + amount(match.groups.hours) * 60 + amount(match.groups.minutes) + amount(match.groups.seconds) / 60);
    return Number.isSafeInteger(total) && total > 0 ? total : null;
  }

  const textMatch = trimmed.match(/^(?:(\d+)\s*h(?:ours?)?)?\s*(\d+)?(?:\s*m(?:in)?)?$/i);
  if (textMatch && (textMatch[1] || textMatch[2])) {
    const hours = Number(textMatch[1] ?? 0);
    const mins = Number(textMatch[2] ?? 0);
    const total = hours * 60 + mins;
    return Number.isSafeInteger(total) && total > 0 ? total : null;
  }

  return null;
}

export function humanDuration(duration?: string | null): string | null {
  const minutes = isoDurationToMinutes(duration);
  if (!minutes) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} h ${remainingMinutes} min`;
  }
  if (hours > 0) {
    return `${hours} h`;
  }
  return `${remainingMinutes} min`;
}

