// Inserts 12 sample studio listings so Home and Explore are not empty.
//
//   npm run seed
//   npm run seed -- --owner you@example.com --name "Your Name"
//
// With --owner the listings appear under My Studio Listings for that account.
// Running it again replaces the earlier sample listings (they carry a seedId).
require("dotenv").config();
const { MongoClient } = require("mongodb");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const ownerEmail = arg("owner", "host@studiospace.example").toLowerCase();
const ownerName = arg("name", "StudioSpace Demo Host");

// Cover images are original illustrations that ship with the client (public/studios).
const art = (slug, cover) => ({
  image: `/studios/${slug}-${cover}.svg`,
  gallery: [1, 2, 3].filter((n) => n !== cover).map((n) => `/studios/${slug}-${n}.svg`),
});

const STUDIOS = [
  {
    title: "North Light Cyc Studio",
    category: "Photo Studio",
    hourlyRate: 85,
    securityDeposit: 150,
    maxCapacity: 12,
    location: "Williamsburg, Brooklyn, NY",
    ...art("photo-studio", 1),
    amenities: ["Natural light", "Cyc wall", "Softboxes & strobes", "Backdrops", "Wi-Fi", "Changing room"],
    overview:
      "A 1,400 sq ft daylight studio with a white cyclorama wall and a bank of north-facing windows. Strobes, softboxes and three paper backdrops are included, and the freight elevator makes loading in gear painless.",
  },
  {
    title: "Brickhouse Loft Photo Space",
    category: "Photo Studio",
    hourlyRate: 65,
    securityDeposit: 100,
    maxCapacity: 8,
    location: "Pearl District, Portland, OR",
    ...art("photo-studio", 2),
    amenities: ["Natural light", "Backdrops", "Wi-Fi", "Kitchenette", "Free parking"],
    overview:
      "An exposed-brick loft with tall arched windows and honey-colored floors, ideal for lifestyle, editorial and product shoots. The attached kitchenette works as a ready-made set for food and home content.",
  },
  {
    title: "Soft Focus Portrait Room",
    category: "Photo Studio",
    hourlyRate: 45,
    securityDeposit: 75,
    maxCapacity: 5,
    location: "Wicker Park, Chicago, IL",
    ...art("photo-studio", 3),
    amenities: ["Softboxes & strobes", "Backdrops", "Changing room", "Air conditioning", "Wi-Fi"],
    overview:
      "A compact, fully equipped portrait room with a hair and makeup station, three seamless paper colors and continuous lighting. A good fit for headshots, small-team brand shoots and test sessions.",
  },
  {
    title: "Blackbox Sound Stage",
    category: "Film Stage",
    hourlyRate: 220,
    securityDeposit: 500,
    maxCapacity: 40,
    location: "Culver City, Los Angeles, CA",
    ...art("film-stage", 1),
    amenities: ["Blackout curtains", "Lighting grid", "Green screen", "Power backup", "Free parking", "Air conditioning"],
    overview:
      "A 3,000 sq ft blackout stage with a 14-foot lighting grid, a painted green screen wall and 400 amps of power. Loading dock access and a production office make it a solid base for commercials and short films.",
  },
  {
    title: "Greenroom Virtual Production Stage",
    category: "Film Stage",
    hourlyRate: 180,
    securityDeposit: 400,
    maxCapacity: 25,
    location: "East Austin, Austin, TX",
    ...art("film-stage", 2),
    amenities: ["Green screen", "Lighting grid", "Blackout curtains", "Wi-Fi", "Kitchenette"],
    overview:
      "A mid-size stage built around a curved green wall and a movable lighting grid, set up for interviews, music videos and compositing work. Crew lounge and kitchenette are included in the rate.",
  },
  {
    title: "The Quiet Mic Podcast Lounge",
    category: "Podcast Lounge",
    hourlyRate: 40,
    securityDeposit: 60,
    maxCapacity: 4,
    location: "Capitol Hill, Seattle, WA",
    ...art("podcast-lounge", 1),
    amenities: ["Soundproofing", "Podcast mics", "Mixing console", "Wi-Fi", "Air conditioning"],
    overview:
      "A treated four-seat podcast room with broadcast mics on boom arms, a mixing desk and headphone feeds for every guest. Bring a drive and walk out with clean multitrack audio.",
  },
  {
    title: "Couch & Cans Video Podcast Set",
    category: "Podcast Lounge",
    hourlyRate: 70,
    securityDeposit: 120,
    maxCapacity: 6,
    location: "Midtown, Atlanta, GA",
    ...art("podcast-lounge", 2),
    amenities: ["Podcast mics", "Soundproofing", "Backdrops", "Wi-Fi", "Free parking", "Changing room"],
    overview:
      "A video-ready podcast set with a deep sofa, warm practical lighting and three camera positions already marked on the floor. Acoustic panels keep the room dry so dialogue stays crisp on camera.",
  },
  {
    title: "Analog Room Recording Suite",
    category: "Music Suite",
    hourlyRate: 95,
    securityDeposit: 200,
    maxCapacity: 8,
    location: "East Nashville, Nashville, TN",
    ...art("music-suite", 1),
    amenities: ["Mixing console", "Studio monitors", "Soundproofing", "Drum kit", "Air conditioning", "Free parking"],
    overview:
      "A control room and live room built for tracking bands, with a 16-channel console, nearfield and midfield monitors, and an isolation booth. A drum kit and a backline of amps are on site.",
  },
  {
    title: "Bedroom Beats Production Pod",
    category: "Music Suite",
    hourlyRate: 35,
    securityDeposit: 50,
    maxCapacity: 3,
    location: "Silver Lake, Los Angeles, CA",
    ...art("music-suite", 2),
    amenities: ["Studio monitors", "Wi-Fi", "Air conditioning", "Power backup"],
    overview:
      "A small production room with calibrated monitors, a MIDI keyboard and a vocal corner, built for beat making, mixing and quick vocal takes. Hourly pricing keeps it easy to drop in between sessions.",
  },
  {
    title: "Harbor Vocal & Voiceover Booth",
    category: "Music Suite",
    hourlyRate: 55,
    securityDeposit: 80,
    maxCapacity: 2,
    location: "South Boston, Boston, MA",
    ...art("music-suite", 3),
    amenities: ["Soundproofing", "Podcast mics", "Studio monitors", "Wi-Fi"],
    overview:
      "A quiet two-person booth with a large-diaphragm condenser, preamps and talkback. Voice actors, singers and audiobook narrators use it for clean takes without street noise.",
  },
  {
    title: "Kiln & Canvas Art Workshop",
    category: "Art Workshop",
    hourlyRate: 30,
    securityDeposit: 50,
    maxCapacity: 14,
    location: "Mission District, San Francisco, CA",
    ...art("art-workshop", 1),
    amenities: ["Natural light", "Wi-Fi", "Kitchenette", "Air conditioning", "Changing room"],
    overview:
      "A bright open floor with long work tables, easels, a sink station and a shared kiln. Painters, ceramicists and small classes book it by the hour and leave the cleanup supplies to us.",
  },
  {
    title: "Print & Press Collective Studio",
    category: "Art Workshop",
    hourlyRate: 38,
    securityDeposit: 60,
    maxCapacity: 10,
    location: "Fishtown, Philadelphia, PA",
    ...art("art-workshop", 2),
    amenities: ["Natural light", "Wi-Fi", "Free parking", "Kitchenette"],
    overview:
      "A screen printing and letterpress workshop with exposure unit, washout booth and drying racks. Ideal for small-run posters, merch drops and hands-on print classes.",
  },
];

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Create the .env file first.");
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const studios = client.db("studiospace").collection("studios");
    const removed = await studios.deleteMany({ seedId: { $exists: true } });

    const now = Date.now();
    const docs = STUDIOS.map((studio, i) => {
      const createdAt = new Date(now - i * 3600 * 1000);
      return {
        ...studio,
        seedId: `seed-${String(i + 1).padStart(2, "0")}`,
        ownerEmail,
        ownerName,
        rating: 0,
        reviewCount: 0,
        createdAt,
        updatedAt: createdAt,
      };
    });
    await studios.insertMany(docs);
    console.log(
      `Replaced ${removed.deletedCount} old sample listing(s) and inserted ${docs.length} for ${ownerEmail}.`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
