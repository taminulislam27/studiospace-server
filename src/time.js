// Booking time helpers. No database or framework code here, so they are easy to test.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const MIN_HOURS = 1;
const MAX_HOURS = 12;

function buildSlot({ date, startTime, endTime, tzOffset }) {
  if (!DATE_RE.test(date || "")) return { error: "Choose a valid date." };
  if (!TIME_RE.test(startTime || "") || !TIME_RE.test(endTime || "")) {
    return { error: "Choose a valid start and end time." };
  }
  const offset = Number(tzOffset);
  if (!Number.isInteger(offset) || offset < -840 || offset > 840) {
    return { error: "Your time zone could not be read. Refresh the page and try again." };
  }

  const [y, mo, d] = date.split("-").map(Number);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    return { error: "Choose a valid date." };
  }

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startAt = new Date(Date.UTC(y, mo - 1, d, sh, sm) + offset * 60000);
  const endAt = new Date(Date.UTC(y, mo - 1, d, eh, em) + offset * 60000);

  if (endAt <= startAt) return { error: "End time must be after the start time." };
  const hours = (endAt - startAt) / 3600000;
  if (hours < MIN_HOURS) return { error: "The minimum booking is 1 hour." };
  if (hours > MAX_HOURS) return { error: "The maximum booking is 12 hours." };

  return { startAt, endAt, hours };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function withEffectiveStatus(booking, now = new Date()) {
  const completed = booking.status === "Confirmed" && new Date(booking.endAt) < now;
  return completed ? { ...booking, status: "Completed" } : booking;
}

module.exports = { buildSlot, overlaps, withEffectiveStatus, MIN_HOURS, MAX_HOURS };
