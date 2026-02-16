export function formatDateAsEuropeRigaYYYYMMDD(date: Date): string {
  // MVP note: this currently uses the device's local date parts.
  // Function naming is Europe/Riga-focused so we can later replace internals
  // with timezone-aware formatting without touching call sites.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayAsEuropeRigaYYYYMMDD(): string {
  return formatDateAsEuropeRigaYYYYMMDD(new Date());
}

export function getLastNDaysRangeAsEuropeRigaYYYYMMDD(days: number): { from: string; to: string } {
  const safeDays = Math.max(1, Math.floor(days));
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(toDate.getDate() - (safeDays - 1));

  return {
    from: formatDateAsEuropeRigaYYYYMMDD(fromDate),
    to: formatDateAsEuropeRigaYYYYMMDD(toDate),
  };
}

export function getDateRangeDescendingAsEuropeRigaYYYYMMDD(from: string, to: string): string[] {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);

  if (!fromYear || !fromMonth || !fromDay || !toYear || !toMonth || !toDay) {
    return [];
  }

  const cursor = new Date(toYear, toMonth - 1, toDay);
  const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
  const dates: string[] = [];

  while (cursor >= fromDate) {
    dates.push(formatDateAsEuropeRigaYYYYMMDD(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  return dates;
}
