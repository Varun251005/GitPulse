export function formatDate(dateString: string): string {
  if (!dateString) return "Unknown"
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date(dateString))
  } catch (e) {
    return "Invalid date"
  }
}
