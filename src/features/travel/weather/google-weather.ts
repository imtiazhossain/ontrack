export function googleWeatherUrl(
  destination: string,
  startDate: string,
  endDate: string,
): string {
  const query =
    startDate === endDate
      ? `weather in ${destination.trim()} on ${startDate}`
      : `weather in ${destination.trim()} from ${startDate} to ${endDate}`;
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query);
  return url.toString();
}
