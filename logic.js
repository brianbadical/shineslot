// ShineSlot rules: plain functions with no browser or storage code, so they can be tested in Node.

// One app, several trades. Each trade only changes wording and the list of choices.
export const TRADES = {
  detailing: {
    name: 'Detailing',
    defaultBusiness: 'Your Detailing',
    tagline: 'Mobile detailing',
    worker: 'the detailer',
    itemLabel: 'Vehicle',
    itemHint: 'For example 2019 Honda CR-V',
    itemError: 'Add the vehicle (for example 2019 Honda CR-V).',
    addressLabel: 'Where will the car be?',
    sizesLabel: 'Vehicle size',
    servicesLabel: 'What do you want done?',
    services: ['Interior', 'Exterior', 'Full detail', 'Pet hair', 'Stains or odor', 'Headlights', 'Engine bay'],
    notesLabel: 'Anything else?',
    notesHint: 'Stains, pet hair, smoke smell, parking notes...',
    photosLabel: 'Photos of the car',
    intro: 'Tell me about your car and what you need. I will send you a price and a time.',
    noteHint: 'For example: includes pet hair, about 3 hours',
    atShop: false,
  },
  mechanic: {
    name: 'Mechanic',
    defaultBusiness: 'Your Garage',
    tagline: 'Auto repair',
    worker: 'the mechanic',
    itemLabel: 'Vehicle',
    itemHint: 'For example 2019 Honda CR-V',
    itemError: 'Add the vehicle (for example 2019 Honda CR-V).',
    addressLabel: 'Where will the car be?',
    sizesLabel: 'Vehicle size',
    servicesLabel: 'What does it need?',
    services: ['Oil change', 'Brakes', 'Check engine light', 'Battery or starting', 'Noise or vibration', 'AC or heat', 'Tune-up', 'Not sure'],
    notesLabel: "What's going on with it?",
    notesHint: 'Sounds, warning lights, when it started, mileage...',
    photosLabel: 'Photos (dash lights, the problem area)',
    intro: "Tell me about your car and what's wrong. I will send you a price and a time.",
    noteHint: 'For example: parts and labor, about 2 hours',
    atShop: true, // customers bring the car to the garage, so no address is asked
  },
  tint: {
    name: 'Window tint',
    defaultBusiness: 'Your Window Tint',
    tagline: 'Window tint',
    worker: 'your installer',
    itemLabel: 'What are we tinting?',
    itemHint: 'For example 2021 Honda Civic, or 4 living room windows',
    itemError: 'Tell us what we are tinting (the car, or which windows).',
    addressLabel: 'Where is it?',
    sizesLabel: 'Vehicle type',
    servicesLabel: 'What do you need?',
    services: ['Full car (sides and back)', 'Front two windows', 'Windshield', 'Windshield strip (brow)', 'Remove old tint', 'Home windows', 'Business or storefront', 'Boat'],
    notesLabel: 'Anything else?',
    notesHint: 'How dark you want it, any cracks or old tint, best time to reach you...',
    photosLabel: 'Photos of the windows',
    intro: 'Tell me what you want tinted. I will send you a price and a time.',
    noteHint: 'For example: 20% sides and back, about 2 hours',
    atShop: false,
    questions: [
      { section: 'About the job' },
      { key: 'kind', label: 'What kind of job?', type: 'choice', options: ['Car, truck or SUV', 'Home', 'Business', 'Boat'] },
      { key: 'shade', label: 'How dark?', type: 'choice', options: ['5% (limo)', '20%', '35%', '50%', '70% (light)', 'Not sure'], hint: 'Lower number = darker.' },
      { key: 'film', label: 'Film type', type: 'choice', options: ['Ceramic', 'Carbon', 'Standard', 'Not sure'] },
      { key: 'oldTint', label: 'Is there old tint to take off?', type: 'choice', options: ['Yes', 'No', 'Not sure'] },
      { section: 'Homes, businesses and boats' },
      { key: 'windows', label: 'About how many windows?' },
      { key: 'winSizes', label: 'Rough window sizes', hint: 'For example 3 ft by 5 ft, or one big sliding door' },
      { key: 'goal', label: 'Main reason', type: 'multi', options: ['Heat', 'Glare', 'Privacy', 'UV / fading', 'Looks', 'Security'] },
    ],
  },
  cleaning: {
    name: 'Cleaning',
    defaultBusiness: 'Your Cleaning',
    tagline: 'Home cleaning',
    worker: 'your cleaner',
    itemLabel: 'Your place',
    itemHint: 'For example 3 bed, 2 bath house',
    itemError: 'Tell us about the place (for example 3 bed, 2 bath house).',
    addressLabel: 'Address',
    addressError: 'Add the address.',
    sizesLabel: 'Home size',
    servicesLabel: 'What kind of clean?',
    services: ['Standard clean', 'Deep clean', 'Airbnb or rental turnover', 'Move-in or move-out', 'Kitchen', 'Bathrooms', 'Inside fridge or oven', 'Windows', 'Laundry', 'Office'],
    notesLabel: 'Anything else?',
    notesHint: 'Pets, how often (weekly, every 2 weeks, one time), how to get in, parking...',
    photosLabel: 'Photos of the rooms',
    intro: 'Tell me about your place and what you need. I will send you a price and a time.',
    noteHint: 'For example: deep clean, about 4 hours, supplies included',
    atShop: false,
    // Questions from Selena's phone intake form. Home type, bedrooms and bathrooms are required
    // and make up the "Your place" line; everything else is optional.
    questions: [
      { section: 'About your home' },
      { key: 'homeType', label: 'Type of home', type: 'choice', options: ['House', 'Apartment', 'Condo', 'Townhouse', 'Other'], required: true },
      { key: 'beds', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5+'], required: true, half: true },
      { key: 'baths', label: 'Bathrooms', type: 'select', options: ['1', '1.5', '2', '2.5', '3', '3.5', '4+'], required: true, half: true },
      { key: 'sqft', label: 'About how many square feet?', hint: 'A guess is fine, for example 1,500' },
      { key: 'floors', label: 'Floors', type: 'multi', options: ['Carpet', 'Hardwood', 'Tile', 'Laminate or vinyl', 'Other'] },
      { key: 'pets', label: 'Pets', hint: 'Type and how many, for example 2 cats' },
      { key: 'petsAway', label: 'Can pets be put away during the clean?', type: 'choice', options: ['Yes', 'No', 'No pets'] },
      { section: 'What you need' },
      { key: 'often', label: 'How often?', type: 'choice', options: ['One time', 'Weekly', 'Every 2 weeks', 'Monthly', 'Not sure yet'] },
      { key: 'why', label: 'What made you reach out today?' },
      { key: 'priority', label: 'What do you most want out of a cleaning service?', hint: 'For example less stress, ready for guests' },
      { key: 'focus', label: 'Most important areas', hint: 'Kitchen, bathrooms...' },
      { key: 'skip', label: 'Anything we should not touch?' },
      { key: 'fragile', label: 'Fragile items or areas that need special care?' },
      { section: 'How it is now' },
      { key: 'nowCleaned', label: 'How often is it cleaned now?', hint: 'For example every few weeks, rarely' },
      { key: 'score', label: 'How clean is it now? (1 = needs a lot, 10 = spotless)', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
      { key: 'problems', label: 'Problem areas?', hint: 'Mold, clutter, stains...' },
      { key: 'recent', label: 'Recent move-in, move-out or renovation?' },
      { key: 'usedBefore', label: 'Used a cleaning service before?', type: 'choice', options: ['Yes', 'No'] },
      { section: 'Getting in and safety' },
      { key: 'access', label: 'How will we get in?', type: 'choice', options: ["I'll be home", 'Key left for you', 'Door code', 'Other'], hint: "Please don't type door codes here. We'll ask when you book." },
      { key: 'parking', label: 'Parking', hint: 'Driveway, street, garage...' },
      { key: 'allergies', label: 'Allergies or sensitivity to cleaning products?' },
      { section: 'Budget and timing' },
      { key: 'budget', label: 'Budget or comfortable range', hint: 'For example $120 to $160' },
      { key: 'start', label: 'Ideal start date', type: 'date' },
      { key: 'comparing', label: 'Getting other quotes too?', type: 'choice', options: ['Yes', 'No'] },
      { key: 'heard', label: 'How did you hear about us?' },
    ],
    composeItem: d => {
      if (!d.homeType || !d.beds || !d.baths) return '';
      const beds = d.beds === 'Studio' ? 'Studio' : `${d.beds} bed`;
      return `${beds}, ${d.baths} bath ${d.homeType.toLowerCase()}` + (d.sqft ? ` · ${d.sqft} sq ft` : '');
    },
  },
};

const MAX_ANSWER = 300;

// ----- sizes with starting prices (owner sets them, for example "Car = 120") -----
export const MAX_SIZES = 8;

// One size per line: "Car = 120", "Small SUV: $140", "Large SUV / pickup = 170+".
export function parseSizes(text) {
  const out = [], errors = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.*\S)\s*[=:\u2013-]\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(\+?)\s*$/);
    if (!m) { errors.push(`"${line}" needs a price, like Car = 120`); continue; }
    const price = Number(m[2].replace(/,/g, ''));
    if (!(price > 0) || price > MAX_PRICE) { errors.push(`"${line}": price must be between $1 and $${MAX_PRICE.toLocaleString('en-US')}`); continue; }
    out.push({ label: m[1].trim().slice(0, 40), price, plus: !!m[3] });
  }
  if (out.length > MAX_SIZES) errors.push(`Up to ${MAX_SIZES} sizes.`);
  return { sizes: out.slice(0, MAX_SIZES), errors };
}
export const sizesText = sizes => (sizes || []).map(z => `${z.label} = ${z.price}${z.plus ? '+' : ''}`).join('\n');
export const sizePrice = z => `$${z.price.toLocaleString('en-US')}${z.plus ? '+' : ''}`;
export const sizeTag = z => `${z.label} · ${sizePrice(z)}`;

// Keep only answers to the trade's own questions, trimmed and short.
export function cleanDetails(raw, trade = 'detailing') {
  const out = {};
  for (const q of tradeOf(trade).questions || []) {
    if (!q.key || !raw || raw[q.key] == null) continue;
    const v = raw[q.key];
    if (q.type === 'multi') {
      const list = (Array.isArray(v) ? v : [v]).map(x => String(x).trim()).filter(x => q.options.includes(x));
      if (list.length) out[q.key] = list;
    } else {
      const t = String(v).trim().slice(0, MAX_ANSWER);
      if (!t) continue;
      if ((q.type === 'choice' || q.type === 'select') && !q.options.includes(t)) continue;
      out[q.key] = t;
    }
  }
  return out;
}

// Answers as [label, text] pairs in question order, for the owner's screens.
export function detailLines(details, trade = 'detailing') {
  if (!details) return [];
  const t = typeof trade === 'string' ? tradeOf(trade) : trade;
  return (t.questions || [])
    .filter(q => q.key && details[q.key] != null && details[q.key] !== '')
    .map(q => [q.label.replace(/ \(.*\)$/, ''), Array.isArray(details[q.key]) ? details[q.key].join(', ') : String(details[q.key])]);
}
// Starter templates for more home and outdoor service jobs. Owners can change the choices
// and add prices in Settings. Each one only sets wording; the app works the same.
function starter(t) {
  return {
    notesLabel: 'Anything else?', photosLabel: 'Photos (they help with the price)', atShop: false,
    addressLabel: 'Address', addressError: 'Add the address.', sizesLabel: 'Job size',
    servicesLabel: 'What do you need?', itemError: `Tell us ${t.itemAsk}.`,
    intro: 'Tell me what you need. I will send you a price and a time.', ...t,
  };
}
Object.assign(TRADES, {
  pressure: starter({
    name: 'Pressure washing', defaultBusiness: 'Your Pressure Washing', tagline: 'Pressure washing', worker: 'your washer',
    itemLabel: 'What needs washing?', itemHint: 'For example 2-story house and driveway', itemAsk: 'what needs washing',
    services: ['House siding', 'Driveway', 'Patio or porch', 'Deck or fence', 'Roof (soft wash)', 'Gutters', 'Sidewalk', 'Business or storefront'],
    sizesLabel: 'Job size', notesHint: 'Mold or stains, water spigot location, pets in the yard...',
    noteHint: 'For example: house and driveway, about 3 hours',
    samples: [['1-story house', 'House siding', 'Green stuff on the north side'], ['Driveway and walkway', 'Driveway', ''], ['Back deck', 'Deck or fence', 'Wood deck, about 12 by 16']],
  }),
  lawn: starter({
    name: 'Lawn care', defaultBusiness: 'Your Lawn Care', tagline: 'Lawn care and yard work', worker: 'your lawn pro',
    itemLabel: 'Tell us about the yard', itemHint: 'For example front and back, about a quarter acre', itemAsk: 'about the yard',
    services: ['Mowing', 'Edging and trimming', 'Leaf cleanup', 'Hedges and bushes', 'Mulch', 'Weeding', 'Sod or seed', 'Yard cleanup'],
    sizesLabel: 'Yard size', notesHint: 'Gate code, dogs, how often (weekly, every 2 weeks, one time)...',
    noteHint: 'For example: mow, edge and blow, every 2 weeks',
    samples: [['Small front and back yard', 'Mowing', 'Every 2 weeks if possible'], ['Corner lot, about half an acre', 'Leaf cleanup', ''], ['Townhouse front strip', 'Hedges and bushes', '']],
  }),
  handyman: starter({
    name: 'Handyman', defaultBusiness: 'Your Handyman', tagline: 'Handyman and small repairs', worker: 'your handyman',
    itemLabel: 'What needs doing?', itemHint: 'For example hang 3 shelves and fix a leaky faucet', itemAsk: 'what needs doing',
    services: ['Small repairs', 'Drywall patch', 'Mount TV or shelves', 'Furniture assembly', 'Doors and locks', 'Faucet or toilet', 'Light fixture', 'Painting touch-up'],
    notesHint: 'Do you have the parts? Which room? Best time to reach you...',
    noteHint: 'For example: 2 hours plus parts',
    samples: [['Mount a 65 inch TV', 'Mount TV or shelves', 'Wall is drywall, I have the mount'], ['Hole in bedroom wall', 'Drywall patch', 'About fist size'], ['Kitchen faucet drips', 'Faucet or toilet', '']],
  }),
  junk: starter({
    name: 'Junk removal', defaultBusiness: 'Your Junk Removal', tagline: 'Junk removal and hauling', worker: 'your hauler',
    itemLabel: 'What needs to go?', itemHint: 'For example old couch, mattress and some boxes', itemAsk: 'what needs to go',
    services: ['Furniture', 'Mattress', 'Appliances', 'Yard waste', 'Garage or attic cleanout', 'Construction debris', 'Hot tub or shed', 'Whole house cleanout'],
    sizesLabel: 'Load size', notesHint: 'Stairs? Is it inside or at the curb? Heavy items...',
    noteHint: 'For example: about a half truck load',
    samples: [['Old couch and recliner', 'Furniture', 'Second floor, narrow stairs'], ['Garage full of boxes', 'Garage or attic cleanout', ''], ['Broken fridge', 'Appliances', 'At the curb']],
  }),
  grooming: starter({
    name: 'Pet grooming', defaultBusiness: 'Your Pet Grooming', tagline: 'Mobile pet grooming', worker: 'your groomer',
    itemLabel: 'Your pet', itemHint: 'For example Max, 40 lb Golden Retriever', itemAsk: 'about your pet (name, breed, size)',
    services: ['Bath and brush', 'Full groom (haircut)', 'Nail trim', 'De-shedding', 'Teeth brushing', 'Ear cleaning', 'Flea bath', 'Puppy first groom'],
    sizesLabel: 'Pet size', addressLabel: 'Where should we come?', notesHint: 'Matting, nervous with dryers, bites, health issues...',
    photosLabel: 'Photos of your pet', noteHint: 'For example: full groom, about 90 minutes',
    samples: [['Bella, 15 lb Shih Tzu', 'Full groom (haircut)', 'A little matted behind the ears'], ['Duke, 80 lb Lab', 'De-shedding', ''], ['Two cats', 'Nail trim', 'They hide, sorry']],
  }),
  painting: starter({
    name: 'Painting', defaultBusiness: 'Your Painting', tagline: 'Interior and exterior painting', worker: 'your painter',
    itemLabel: 'What are we painting?', itemHint: 'For example 2 bedrooms and a hallway', itemAsk: 'what we are painting',
    services: ['Interior walls', 'Ceilings', 'Trim and doors', 'Cabinets', 'Exterior', 'Deck or fence stain', 'Drywall repair', 'Color help'],
    sizesLabel: 'Job size', notesHint: 'Do you have the paint? Colors, furniture to move, high ceilings...',
    photosLabel: 'Photos of the rooms', noteHint: 'For example: 2 coats, paint included, 2 days',
    samples: [['Living room, 12 by 18', 'Interior walls', 'Going from dark red to white'], ['Kitchen cabinets, 20 doors', 'Cabinets', ''], ['Front of the house', 'Exterior', 'Peeling near the garage']],
  }),
  pool: starter({
    name: 'Pool service', defaultBusiness: 'Your Pool Service', tagline: 'Pool cleaning and care', worker: 'your pool tech',
    itemLabel: 'Tell us about the pool', itemHint: 'For example in-ground, about 15,000 gallons, with spa', itemAsk: 'about the pool',
    services: ['Weekly cleaning', 'One-time cleanup', 'Green pool rescue', 'Chemicals and testing', 'Filter cleaning', 'Opening or closing', 'Pump or equipment check', 'Tile cleaning'],
    sizesLabel: 'Pool size', notesHint: 'Gate code, dogs, screen enclosure, salt or chlorine...',
    photosLabel: 'Photos of the pool', noteHint: 'For example: weekly, chemicals included',
    samples: [['In-ground, screened', 'Weekly cleaning', 'Salt system'], ['Above ground, 24 ft', 'Green pool rescue', 'Been sitting a month'], ['Pool and spa', 'Filter cleaning', '']],
  }),
  carpet: starter({
    name: 'Carpet cleaning', defaultBusiness: 'Your Carpet Cleaning', tagline: 'Carpet and upholstery cleaning', worker: 'your cleaner',
    itemLabel: 'What needs cleaning?', itemHint: 'For example 3 bedrooms and a sectional couch', itemAsk: 'what needs cleaning',
    services: ['Carpet (rooms)', 'Stairs', 'Couch or sectional', 'Chairs', 'Area rugs', 'Mattress', 'Pet stains and odor', 'Tile and grout'],
    sizesLabel: 'Job size', notesHint: 'Pets, stains, how many rooms, furniture to move...',
    noteHint: 'For example: 3 rooms plus stairs, dry in 4 to 6 hours',
    samples: [['3 bedrooms and hallway', 'Carpet (rooms)', 'Dog accidents in one room'], ['Sectional couch', 'Couch or sectional', 'Light gray fabric'], ['Stairs, 14 steps', 'Stairs', '']],
  }),
  windows: starter({
    name: 'Window cleaning', defaultBusiness: 'Your Window Cleaning', tagline: 'Window cleaning', worker: 'your window cleaner',
    itemLabel: 'Tell us about the windows', itemHint: 'For example 2-story house, about 20 windows', itemAsk: 'about the windows',
    services: ['Outside only', 'Inside and outside', 'Screens', 'Tracks and sills', 'Hard water stains', 'Skylights', 'Storefront', 'Gutters'],
    sizesLabel: 'Job size', notesHint: 'Hard-to-reach windows, ladders needed, pets...',
    noteHint: 'For example: inside and out with screens',
    samples: [['1-story ranch, 14 windows', 'Inside and outside', ''], ['Storefront, 4 big panes', 'Storefront', 'Every 2 weeks'], ['2-story, 22 windows', 'Outside only', 'Some are high in the back']],
  }),
  moving: starter({
    name: 'Moving help', defaultBusiness: 'Your Moving Help', tagline: 'Moving and hauling help', worker: 'your movers',
    itemLabel: 'What are we moving?', itemHint: 'For example 2 bedroom apartment, second floor', itemAsk: 'what we are moving',
    services: ['Load a truck', 'Unload a truck', 'Full move with truck', 'Single big item', 'Rearrange furniture', 'Packing help', 'Storage unit', 'Piano or safe'],
    sizesLabel: 'Move size', addressLabel: 'Moving from (and to, if you know)', notesHint: 'Stairs or elevator, heavy items, moving date...',
    noteHint: 'For example: 2 movers, about 3 hours',
    samples: [['1 bedroom apartment', 'Load a truck', 'Third floor, no elevator'], ['Couch to a new house', 'Single big item', ''], ['3 bedroom house', 'Full move with truck', 'Moving on the 30th']],
  }),
});

export const tradeOf = key => (key && typeof key === 'object') ? key : (TRADES[key] || TRADES.detailing);

// The trade as this owner set it up: extra questions they turned off are removed, and
// questions where they trimmed the answers use their list. Required questions always stay.
export const MAX_ANSWERS = 12;
export function tradeFor(settings) {
  const base = tradeOf(settings && settings.trade);
  const ov = (settings && settings.questions) || {};
  if (!base.questions || !Object.keys(ov).length) return base;
  const qs = base.questions.map(q => {
    const o = q.key && !q.required ? ov[q.key] : null;
    if (!o) return q;
    if (o.off) return null;
    return q.options && Array.isArray(o.options) && o.options.length ? { ...q, options: o.options } : q;
  }).filter(Boolean);
  const questions = qs.filter((q, i) => !q.section || (qs[i + 1] && !qs[i + 1].section));
  return { ...base, questions };
}

// Read the "Extra questions" part of Settings: { key: { off, options } } for questions the owner changed.
export function parseQuestions(trade, form) {
  const out = {}, errors = [];
  for (const q of tradeOf(trade).questions || []) {
    if (!q.key || q.required) continue;
    const on = !!form['ask_' + q.key];
    let options;
    if (q.options && form['opts_' + q.key] != null) {
      options = [...new Set(String(form['opts_' + q.key]).split('\n').map(x => x.trim().slice(0, 40)).filter(Boolean))];
      if (on && !options.length) { errors.push(`"${q.label}" needs at least one answer, or turn it off.`); continue; }
      if (options.length > MAX_ANSWERS) errors.push(`"${q.label}": up to ${MAX_ANSWERS} answers.`);
      options = options.slice(0, MAX_ANSWERS);
      if (options.join('\n') === q.options.join('\n')) options = undefined;
    }
    if (!on || options) out[q.key] = { ...(on ? {} : { off: true }), ...(options ? { options } : {}) };
  }
  return { questions: out, errors };
}
export const SERVICES = TRADES.detailing.services;
export const TIMES = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Saturday', 'Sunday'];
export const MAX_PRICE = 10000;
export const MAX_PHOTOS = 4;

// new -> quoted -> accepted -> done. The owner can decline a new or quoted request.
export const STATUS_LABEL = { new: 'New request', quoted: 'Price sent', accepted: 'Booked', done: 'Done', declined: 'Declined' };

const clean = v => String(v ?? '').trim();

export function validateRequest(input, trade = 'detailing') {
  const errors = [];
  const t = tradeOf(trade);
  if (t.composeItem) {
    const d = cleanDetails(input.details, trade);
    for (const q of t.questions) if (q.required && !d[q.key]) errors.push(`Please answer: ${q.label}.`);
    input = { ...input, vehicle: t.composeItem(d) || input.vehicle };
  }
  if (!clean(input.name)) errors.push('Add your name.');
  const phone = clean(input.phone), email = clean(input.email);
  if (!phone && !email) errors.push('Add a phone number or email so we can reply.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('That email does not look right.');
  if (phone && phone.replace(/\D/g, '').length < 7) errors.push('That phone number looks too short.');
  if (!clean(input.vehicle) && !t.composeItem) errors.push(t.itemError); // 'vehicle' holds the car, or the home for cleaning
  if (!Array.isArray(input.services) || input.services.length === 0) errors.push('Pick at least one thing you want done.');
  if (!t.atShop && !clean(input.address)) errors.push(t.addressError || 'Add the address or area where the car will be.');
  if ((input.photos || []).length > MAX_PHOTOS) errors.push(`Up to ${MAX_PHOTOS} photos.`);
  return errors;
}

export function makeRequest(input, { id, now, trade = 'detailing' }) {
  const errors = validateRequest(input, trade);
  if (errors.length) throw new Error(errors.join(' '));
  const t = tradeOf(trade);
  const details = cleanDetails(input.details, trade);
  if (t.composeItem) input = { ...input, vehicle: t.composeItem(details) };
  return {
    id,
    createdAt: now,
    status: 'new',
    name: clean(input.name),
    phone: clean(input.phone),
    email: clean(input.email),
    vehicle: clean(input.vehicle),
    services: input.services.map(clean).filter(Boolean),
    times: (input.times || []).map(clean).filter(Boolean),
    address: clean(input.address),
    notes: clean(input.notes),
    photos: (input.photos || []).slice(0, MAX_PHOTOS),
    ...(Object.keys(details).length ? { details } : {}),
    ...(input.size && input.size.label ? { size: sizeTag(input.size), sizePrice: input.size.price } : {}),
    ...(cleanRef(input.ref) ? { ref: cleanRef(input.ref) } : {}),
    ...(['1', '2', '4'].includes(String(input.repeat || '')) ? { repeat: String(input.repeat) } : {}),
    quote: null,
    history: [{ at: now, what: 'Request sent' }],
  };
}

export function parsePrice(v) {
  const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a price above $0.');
  if (n > MAX_PRICE) throw new Error(`Prices over $${MAX_PRICE.toLocaleString('en-US')} are not allowed.`);
  return Math.round(n * 100) / 100;
}

// `when` is a local date-time string like 2026-11-07T09:00 (what <input type="datetime-local"> gives).
export function parseWhen(v) {
  const s = clean(v);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) throw new Error('Pick a day and time for the job.');
  return s;
}

export function applyQuote(req, { price, when, note, now }) {
  if (req.status !== 'new' && req.status !== 'quoted') throw new Error(`Can't send a price for a request that is ${STATUS_LABEL[req.status].toLowerCase()}.`);
  const quote = { price: parsePrice(price), when: parseWhen(when), note: clean(note) };
  return { ...req, status: 'quoted', quote, history: [...req.history, { at: now, what: `Price sent: ${money(quote.price)}` }] };
}

export function applyAccept(req, { now }) {
  if (req.status !== 'quoted' || !req.quote) throw new Error('This quote can no longer be accepted.');
  return { ...req, status: 'accepted', history: [...req.history, { at: now, what: 'Customer accepted' }] };
}

export function applyDone(req, { now }) {
  if (req.status !== 'accepted') throw new Error('Only booked jobs can be marked done.');
  return { ...req, status: 'done', history: [...req.history, { at: now, what: 'Job done' }] };
}

export function applyDecline(req, { now }) {
  if (req.status !== 'new' && req.status !== 'quoted') throw new Error('Only open requests can be declined.');
  return { ...req, status: 'declined', history: [...req.history, { at: now, what: 'Declined' }] };
}

const ORDER = { new: 0, quoted: 1, accepted: 2, done: 3, declined: 4 };
export function inboxOrder(reqs) {
  return [...reqs].sort((a, b) => ORDER[a.status] - ORDER[b.status] || String(b.createdAt).localeCompare(String(a.createdAt)));
}

// Booked or finished jobs on one day (YYYY-MM-DD), earliest first.
export function jobsForDay(reqs, day) {
  return reqs
    .filter(r => (r.status === 'accepted' || r.status === 'done') && r.quote && r.quote.when.slice(0, 10) === day)
    .sort((a, b) => a.quote.when.localeCompare(b.quote.when));
}

export function dayTotal(jobs) {
  return Math.round(jobs.reduce((t, r) => t + (r.quote ? r.quote.price : 0), 0) * 100) / 100;
}

export function money(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}

// "Sat, Nov 7, 9:00 AM" from 2026-11-07T09:00, without time-zone shifts.
export function prettyWhen(when) {
  const [d, t] = when.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  const wk = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const mo = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const hh = ((h + 11) % 12) + 1;
  return `${wk}, ${mo} ${day}, ${hh}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function localDay(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function mapsLink(address) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}

// Monday-first week containing `day` (YYYY-MM-DD): 7 days, each with its booked jobs.
export function weekOf(reqs, day) {
  const [y, m, d] = day.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const monday = new Date(y, m - 1, d - ((base.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = localDay(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
    const jobs = jobsForDay(reqs, date);
    return { date, jobs, total: dayTotal(jobs) };
  });
}

export function shiftDay(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

// ---------- Availability ----------
// hours: { mon: ['08:00', '17:00'] | null, ... }  null = closed that day.
// blocks: [{ id, date: 'YYYY-MM-DD', start?: 'HH:MM', end?: 'HH:MM', note? }]  no start/end = whole day off.
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const WEEKDAY_NAMES = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
export const DEFAULT_HOURS = { sun: null, mon: ['08:00', '17:00'], tue: ['08:00', '17:00'], wed: ['08:00', '17:00'], thu: ['08:00', '17:00'], fri: ['08:00', '17:00'], sat: ['09:00', '14:00'] };
export const JOB_MINUTES = 60; // two jobs closer than this count as a clash

const isTime = t => /^\d{2}:\d{2}$/.test(t || '');
const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function weekdayOf(day) { const [y, m, d] = day.split('-').map(Number); return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; }

export function hoursOf(settings) { return { ...DEFAULT_HOURS, ...(settings && settings.hours) }; }

export function validateBlock(b) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) throw new Error('Pick a day to block.');
  const whole = !b.start && !b.end;
  if (!whole) {
    if (!isTime(b.start) || !isTime(b.end)) throw new Error('Pick a start and end time, or block the whole day.');
    if (mins(b.end) <= mins(b.start)) throw new Error('The end time must be after the start time.');
  }
  return { id: b.id, date: b.date, ...(whole ? {} : { start: b.start, end: b.end }), ...(b.note ? { note: String(b.note).trim().slice(0, 80) } : {}) };
}

export function blocksOn(settings, day) { return ((settings && settings.blocks) || []).filter(b => b.date === day); }

// Is this day open for work at all (has hours and is not blocked all day)?
export function isOpenDay(settings, day) {
  if (!hoursOf(settings)[weekdayOf(day)]) return false;
  return !blocksOn(settings, day).some(b => !b.start);
}

// The next `n` days from `from` (inclusive) that are open.
export function openDays(settings, from, n = 14) {
  const out = [];
  for (let i = 0; i < n; i++) { const d = shiftDay(from, i); if (isOpenDay(settings, d)) out.push(d); }
  return out;
}

// Problems with putting a job at `when` (YYYY-MM-DDTHH:MM). Empty list = fine.
export function clashes(settings, reqs, when, selfId) {
  const day = when.slice(0, 10), t = mins(when.slice(11, 16));
  const out = [];
  const h = hoursOf(settings)[weekdayOf(day)];
  if (!h) out.push(`You're closed on ${WEEKDAY_NAMES[weekdayOf(day)]}s.`);
  else if (t < mins(h[0]) || t >= mins(h[1])) out.push(`That's outside your hours (${prettyTime(h[0])} to ${prettyTime(h[1])}).`);
  for (const b of blocksOn(settings, day)) {
    if (!b.start) out.push(`That day is blocked off${b.note ? ` (${b.note})` : ''}.`);
    else if (t >= mins(b.start) && t < mins(b.end)) out.push(`That time is blocked off${b.note ? ` (${b.note})` : ''}.`);
  }
  for (const r of reqs) {
    if (r.id === selfId || !r.quote || (r.status !== 'accepted' && r.status !== 'quoted')) continue;
    if (r.quote.when.slice(0, 10) !== day) continue;
    if (Math.abs(mins(r.quote.when.slice(11, 16)) - t) < JOB_MINUTES) out.push(`Close to ${r.name.split(' ')[0]}'s job at ${prettyTime(r.quote.when.slice(11, 16))}.`);
  }
  return out;
}

export function prettyTime(t) { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; }
export function prettyDay(day) { return prettyWhen(day + 'T00:00').split(', ').slice(0, 2).join(', '); }

// ----- getting paid (optional for each owner) -----
export const PAY_METHODS = ['Cash', 'Card', 'Cash App', 'Venmo', 'PayPal', 'Zelle', 'Check', 'Other'];

// Owner's pay details. Returns { pay, errors }. Nothing here moves money; the buttons
// just open the owner's own Cash App, Venmo, PayPal or card page.
export function validatePay(raw = {}) {
  const errors = [], pay = { on: !!raw.on };
  const cashapp = clean(raw.cashapp).replace(/^\$/, '');
  if (cashapp) { if (/^[A-Za-z][A-Za-z0-9_-]{0,19}$/.test(cashapp)) pay.cashapp = cashapp; else errors.push('Cash App: use your $cashtag, like $SterlShine.'); }
  const venmo = clean(raw.venmo).replace(/^@/, '');
  if (venmo) { if (/^[A-Za-z0-9_-]{3,30}$/.test(venmo)) pay.venmo = venmo; else errors.push('Venmo: use your username, like @Sterl-Shine.'); }
  const paypal = clean(raw.paypal).replace(/^(https?:\/\/)?(www\.)?paypal\.me\//i, '').replace(/\/.*$/, '');
  if (paypal) { if (/^[A-Za-z0-9]{1,20}$/.test(paypal)) pay.paypal = paypal; else errors.push('PayPal: use your paypal.me name.'); }
  const zelle = clean(raw.zelle).slice(0, 60);
  if (zelle) pay.zelle = zelle;
  const card = clean(raw.cardLink);
  if (card) { if (/^https:\/\/[^\s"'<>]{4,300}$/.test(card)) pay.cardLink = card; else errors.push('Card link must start with https:// (copy it from Square or Stripe).'); }
  if (pay.on && !pay.cashapp && !pay.venmo && !pay.paypal && !pay.zelle && !pay.cardLink) errors.push('Add at least one way to pay, or turn pay buttons off.');
  return { pay, errors };
}

// Buttons for the customer's page. amount fills in where the app allows it.
export function payLinks(pay, amount) {
  if (!pay || !pay.on) return [];
  const a = amount > 0 ? String(Math.round(amount * 100) / 100) : '';
  const out = [];
  if (pay.cardLink) out.push({ label: 'Pay by card', href: pay.cardLink });
  if (pay.cashapp) out.push({ label: 'Cash App', href: `https://cash.app/$${encodeURIComponent(pay.cashapp)}${a ? '/' + a : ''}` });
  if (pay.venmo) out.push({ label: 'Venmo', href: `https://venmo.com/${encodeURIComponent(pay.venmo)}?txn=pay${a ? '&amount=' + a : ''}` });
  if (pay.paypal) out.push({ label: 'PayPal', href: `https://paypal.me/${encodeURIComponent(pay.paypal)}${a ? '/' + a + 'USD' : ''}` });
  if (pay.zelle) out.push({ label: `Zelle: ${pay.zelle}` });
  return out;
}

export function applyPaid(req, { amount, tip, method, now }) {
  if (req.status !== 'accepted' && req.status !== 'done') throw new Error('Only booked jobs can be marked paid.');
  const amt = parsePrice(amount);
  const t = clean(tip) ? Number(String(tip).replace(/[$,\s]/g, '')) : 0;
  if (!Number.isFinite(t) || t < 0 || t > MAX_PRICE) throw new Error('That tip does not look right.');
  const m = PAY_METHODS.includes(method) ? method : 'Other';
  const paid = { amount: amt, tip: Math.round(t * 100) / 100, method: m, at: now };
  return { ...req, paid, history: [...req.history, { at: now, what: `Paid ${money(amt + paid.tip)} (${m})` }] };
}

export function applyUnpaid(req, { now }) {
  const { paid, ...rest } = req;
  return { ...rest, paid: null, history: [...req.history, { at: now, what: 'Payment removed' }] };
}

// Money in by week (Monday start), month and year, plus what is still owed for past jobs.
export function earnings(reqs, today = localDay(), nowWhen = today + 'T23:59') {
  const d = new Date(today + 'T12:00');
  const monday = shiftDay(today, -((d.getDay() + 6) % 7));
  const sum = { week: 0, month: 0, year: 0, tips: 0, owed: 0, owedCount: 0 };
  for (const r of reqs) {
    if (r.paid && r.paid.at) {
      const day = localDay(new Date(r.paid.at)), got = r.paid.amount + (r.paid.tip || 0);
      if (day.slice(0, 4) === today.slice(0, 4)) { sum.year += got; sum.tips += r.paid.tip || 0; }
      if (day.slice(0, 7) === today.slice(0, 7)) sum.month += got;
      if (day >= monday && day <= today) sum.week += got;
    } else if ((r.status === 'done' || (r.status === 'accepted' && r.quote && r.quote.when <= nowWhen)) && r.quote) {
      sum.owed += r.quote.price; sum.owedCount++;
    }
  }
  for (const k of ['week', 'month', 'year', 'tips', 'owed']) sum[k] = Math.round(sum[k] * 100) / 100;
  return sum;
}

// The tick-box choices on the customer form: the owner's own list, or the trade's starter list.
export const MAX_CHOICES = 15;
export function servicesOf(settings) {
  const own = Array.isArray(settings && settings.services) ? settings.services.filter(x => typeof x === 'string' && x.trim()) : [];
  return own.length ? own : tradeOf(settings && settings.trade).services;
}
export function parseChoices(text) {
  const list = [...new Set(String(text || '').split('\n').map(x => x.trim().slice(0, 50)).filter(Boolean))];
  return { choices: list.slice(0, MAX_CHOICES), errors: list.length > MAX_CHOICES ? [`Up to ${MAX_CHOICES} choices.`] : list.length ? [] : ['Add at least one choice.'] };
}

// ---------- referrals ----------
// A booking link can say who sent the customer: #book-<link>~<name>, for example #book-selenas-cleaning~brian.
export function cleanRef(v) {
  const s = String(v ?? '').replace(/[^A-Za-z0-9 '-]/g, '').trim().slice(0, 30);
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}
export function splitBookLink(rest) {
  const [slug, ref] = String(rest || '').split('~');
  return { slug, ref: cleanRef(decodeURIComponent(ref || '')) };
}

// ---------- ratings ----------
// Customers rate a job once, after it is done. Two taps: stars, then a few quick choices.
export const RATING_GOOD = ['On time', 'Great work', 'Friendly', 'Fair price'];
export const RATING_BAD = ['Late', 'Missed spots', 'Damage', 'No-show'];
export function canRate(req, nowWhen) {
  if (!req || req.rating) return false;
  return req.status === 'done' || (req.status === 'accepted' && !!req.quote && req.quote.when <= nowWhen);
}
export function validateRating(input) {
  const stars = Number(input && input.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('Tap 1 to 5 stars.');
  const allowed = stars >= 4 ? RATING_GOOD : RATING_BAD;
  const tags = [...new Set((input.tags || []).filter(t => allowed.includes(t)))];
  const comment = clean(input.comment).slice(0, 500);
  return { stars, tags, ...(comment ? { comment } : {}) };
}
export function ratingSummary(reqs) {
  const rated = reqs.filter(r => r.rating && r.rating.stars).sort((a, b) => String(b.rating.at || '').localeCompare(String(a.rating.at || '')));
  if (!rated.length) return { count: 0, avg: 0, recent: [], flags: 0 };
  const avg = Math.round(rated.reduce((t, r) => t + r.rating.stars, 0) / rated.length * 10) / 10;
  const flags = rated.filter(r => (r.rating.tags || []).some(t => t === 'Damage' || t === 'No-show')).length;
  return { count: rated.length, avg, recent: rated.slice(0, 5), flags };
}
export function starsText(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

// ---------- repeat customers ----------
export const REPEAT_CHOICES = [['', 'Just this once'], ['1', 'Every week'], ['2', 'Every 2 weeks'], ['4', 'Every 4 weeks']];
const OFTEN_WEEKS = { 'Weekly': 1, 'Every 2 weeks': 2, 'Monthly': 4 };
// How many weeks between visits, or 0. Uses the "How often?" choice, or the cleaning form's answer.
export function repeatWeeks(r) {
  if (r && ['1', '2', '4'].includes(String(r.repeat || ''))) return Number(r.repeat);
  return (r && r.details && OFTEN_WEEKS[r.details.often]) || 0;
}
export function repeatLabel(r) {
  const w = repeatWeeks(r);
  return w ? (REPEAT_CHOICES.find(c => c[0] === String(w)) || [])[1] : '';
}
const contactKey = r => (String(r.phone || '').replace(/\D/g, '').slice(-10) || String(r.email || '').toLowerCase().trim());
// Regular customers whose next visit is due within `ahead` days and who have nothing booked or open yet.
export function dueForRebook(reqs, today, ahead = 3) {
  const byWho = new Map();
  for (const r of reqs) {
    const k = contactKey(r); if (!k) continue;
    if (!byWho.has(k)) byWho.set(k, []);
    byWho.get(k).push(r);
  }
  const out = [];
  for (const list of byWho.values()) {
    if (list.some(r => r.status === 'new' || r.status === 'quoted' || (r.status === 'accepted' && r.quote && r.quote.when.slice(0, 10) >= today))) continue;
    const jobs = list.filter(r => (r.status === 'done' || r.status === 'accepted') && r.quote).sort((a, b) => b.quote.when.localeCompare(a.quote.when));
    const last = jobs[0];
    const w = last && (repeatWeeks(last) || repeatWeeks(list.find(repeatWeeks) || {}));
    if (!w) continue;
    const due = shiftDay(last.quote.when.slice(0, 10), w * 7);
    if (due <= shiftDay(today, ahead)) out.push({ req: last, due, weeks: w });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}
// What a customer's earlier request fills in when they tap "Book again".
export function againFields(r) {
  const keep = ['name', 'phone', 'email', 'vehicle', 'address', 'services', 'details', 'repeat', 'ref'];
  return Object.fromEntries(keep.filter(k => r && r[k] != null && r[k] !== '').map(k => [k, r[k]]));
}
