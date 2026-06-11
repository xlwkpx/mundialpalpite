export function formatPortugalDate(value: string) {
  return new Date(value).toLocaleDateString('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatPortugalTime(value: string | null | undefined) {
  if (!value) return 'Hora por definir';

  return new Date(value).toLocaleTimeString('pt-PT', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPortugalDateTime(value: string) {
  return new Date(value).toLocaleString('pt-PT', {
    timeZone: 'Europe/Lisbon',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}