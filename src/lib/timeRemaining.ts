export function timeRemaining(startTime: string | Date): { text: string; urgent: boolean } {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return { text: "Starting soon", urgent: true };

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) return { text: `${days}d ${hours % 24}h remaining`, urgent: false };
  if (hours >= 1) return { text: `${hours}h ${minutes % 60}m remaining`, urgent: minutes < 60 };
  return { text: `${minutes}m remaining`, urgent: true };
}
