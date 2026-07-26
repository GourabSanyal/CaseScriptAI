const pad = (value: number) => value.toString().padStart(2, '0');

export const formatSessionTimer = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
};
