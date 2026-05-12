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

  const match = duration.match(isoDurationPattern);
  if (!match?.groups) {
    return null;
  }

  const days = Number(match.groups.days ?? 0);
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);
  const seconds = Number(match.groups.seconds ?? 0);
  return days * 24 * 60 + hours * 60 + minutes + Math.ceil(seconds / 60);
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
