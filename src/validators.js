// Request validation. Every function returns { error } or { data }.

const CATEGORIES = [
  "Photo Studio",
  "Film Stage",
  "Podcast Lounge",
  "Music Suite",
  "Art Workshop",
];

const text = (value) => (typeof value === "string" ? value.trim() : "");
const fail = (error) => ({ error });

// Accepts full http(s) URLs and site-relative paths such as /studios/photo-1.svg
function isImageUrl(value) {
  if (typeof value !== "string" || value.length > 500) return false;
  if (value.startsWith("/")) return value.length > 1 && !value.startsWith("//") && !/\s/.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseStudio(body) {
  const input = body || {};

  const title = text(input.title);
  if (title.length < 3 || title.length > 80) {
    return fail("Title must be between 3 and 80 characters.");
  }

  const category = text(input.category);
  if (!CATEGORIES.includes(category)) return fail("Choose a valid category.");

  const hourlyRate = Number(input.hourlyRate);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 1 || hourlyRate > 10000) {
    return fail("Hourly rate must be between $1 and $10,000.");
  }

  const securityDeposit = Number(input.securityDeposit ?? 0);
  if (!Number.isFinite(securityDeposit) || securityDeposit < 0 || securityDeposit > 100000) {
    return fail("Security deposit must be between $0 and $100,000.");
  }

  const maxCapacity = Number(input.maxCapacity);
  if (!Number.isInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > 500) {
    return fail("Max capacity must be a whole number between 1 and 500.");
  }

  const location = text(input.location);
  if (location.length < 3 || location.length > 120) {
    return fail("Location must be between 3 and 120 characters.");
  }

  const image = text(input.image);
  if (!isImageUrl(image)) return fail("Add a valid cover image URL (https://...).");

  const galleryInput = Array.isArray(input.gallery) ? input.gallery : [];
  const gallery = [...new Set(galleryInput.map(text).filter(Boolean))];
  if (gallery.length > 6) return fail("You can add up to 6 gallery images.");
  if (!gallery.every(isImageUrl)) return fail("Every gallery image must be a valid URL.");

  const amenitiesInput = Array.isArray(input.amenities) ? input.amenities : [];
  const amenities = [...new Set(amenitiesInput.map(text).filter(Boolean))];
  if (amenities.length > 20) return fail("Choose up to 20 amenities.");
  if (amenities.some((a) => a.length > 40)) return fail("Each amenity must be 40 characters or fewer.");

  const overview = text(input.overview);
  if (overview.length < 20 || overview.length > 2000) {
    return fail("Overview must be between 20 and 2000 characters.");
  }

  return {
    data: {
      title,
      category,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      securityDeposit: Math.round(securityDeposit * 100) / 100,
      maxCapacity,
      location,
      image,
      gallery,
      amenities,
      overview,
    },
  };
}

function parseReview(body) {
  const input = body || {};
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail("Choose a rating from 1 to 5 stars.");
  }
  const comment = text(input.comment);
  if (comment.length < 5 || comment.length > 500) {
    return fail("Your review must be between 5 and 500 characters.");
  }
  return { data: { rating, comment } };
}

module.exports = { CATEGORIES, parseStudio, parseReview, isImageUrl };
