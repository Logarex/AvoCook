const isoDurationPattern =
  /^P(?:(?<days>\d+)D)?(?:T(?:(?<hours>\d+)H)?(?:(?<minutes>\d+)M)?(?:(?<seconds>\d+)S)?)?$/;

export function minutesToIsoDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0 || Number.isNaN(minutes)) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `PT${hours}H${remainingMinutes}M`;
  }
  return `PT${remainingMinutes}M`;
}

export function isoDurationToMinutes(duration?: string | null): number | null {
  if (!duration) {
    return null;
  }

  const trimmed = duration.trim();
  if (!trimmed) {
    return null;
  }

  // 1) Direct numeric string (e.g. "15", "90")
  if (/^\d+$/.test(trimmed)) {
    const val = Number(trimmed);
    return val > 0 ? val : null;
  }

  // 2) Standard ISO 8601 pattern
  const match = trimmed.match(isoDurationPattern);
  if (match?.groups) {
    const days = Number(match.groups.days ?? 0);
    const hours = Number(match.groups.hours ?? 0);
    const minutes = Number(match.groups.minutes ?? 0);
    const seconds = Number(match.groups.seconds ?? 0);
    const total = days * 24 * 60 + hours * 60 + minutes + Math.ceil(seconds / 60);
    return total > 0 ? total : null;
  }

  // 3) Fallback text formats like "1h30", "1 h 30 min", "15 min", "1h"
  const textMatch = trimmed.match(/^(?:(\d+)\s*h(?:ours?)?)?\s*(\d+)?(?:\s*m(?:in)?)?$/i);
  if (textMatch && (textMatch[1] || textMatch[2])) {
    const hours = Number(textMatch[1] ?? 0);
    const mins = Number(textMatch[2] ?? 0);
    const total = hours * 60 + mins;
    return total > 0 ? total : null;
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

