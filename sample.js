// Made-up requests for trying the app. Names, phones and addresses are fake.
import { makeRequest, applyQuote, applyAccept, localDay, tradeOf } from './logic.js?v=202611020122';

export function sampleRequests(now, trade = 'detailing') {
  const iso = now.toISOString();
  const day = n => localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
  const mech = trade === 'mechanic', clean = trade === 'cleaning';
  const t = tradeOf(trade);
  const rows = t.samples ? t.samples.map(([vehicle, svc, notes], i) => ({
    name: ['Jordan Sample', 'Casey Demo', 'Riley Test'][i], phone: '555-010' + (i + 1), vehicle, services: [svc],
    times: [['Saturday', 'Weekday evenings', 'Weekday mornings'][i]], address: ['100 Example St', '22 Sample Ave', '7 Placeholder Rd'][i], notes,
  })) : clean ? [
    { name: 'Jordan Sample', phone: '555-0101', vehicle: '3 bed, 2 bath house', services: ['Deep clean'], times: ['Saturday'], address: '100 Example St', notes: 'Two cats. Every 2 weeks after this.', details: { homeType: 'House', beds: '3', baths: '2', sqft: '1,600', floors: ['Carpet', 'Hardwood'], pets: '2 cats', often: 'Every 2 weeks', focus: 'Kitchen and bathrooms', score: '5', access: "I'll be home", budget: '$150 to $200', heard: 'Friend' } },
    { name: 'Casey Demo', email: 'casey@example.com', vehicle: '1 bed apartment', services: ['Move-in or move-out'], times: ['Weekday mornings'], address: '22 Sample Ave', notes: 'Moving out on the 15th.', details: { homeType: 'Apartment', beds: '1', baths: '1', often: 'One time', recent: 'Moving out on the 15th' } },
    { name: 'Riley Test', phone: '555-0103', vehicle: '2 bed condo', services: ['Standard clean', 'Inside fridge or oven'], times: ['Weekday afternoons'], address: '7 Placeholder Rd', notes: '', details: { homeType: 'Condo', beds: '2', baths: '2' } },
  ] : [
    { name: 'Jordan Sample', phone: '555-0101', vehicle: '2019 Honda CR-V', services: mech ? ['Brakes'] : ['Interior', 'Pet hair'], times: ['Saturday'], address: '100 Example St', notes: mech ? 'Squeals when I stop, worse in the morning.' : 'Dog hair everywhere, back seats mostly.' },
    { name: 'Casey Demo', email: 'casey@example.com', vehicle: '2015 Ford F-150', services: mech ? ['Check engine light'] : ['Full detail'], times: ['Weekday evenings'], address: '22 Sample Ave', notes: mech ? 'Light came on last week, runs fine.' : '' },
    { name: 'Riley Test', phone: '555-0103', vehicle: '2021 Toyota Camry', services: mech ? ['Oil change'] : ['Exterior'], times: ['Weekday mornings'], address: '7 Placeholder Rd', notes: '' },
  ];
  const [a, b, c] = rows.map((r, i) => makeRequest(mech ? { ...r, address: '' } : r, { trade, id: 'sample' + (i + 1) + Date.now().toString(36), now: iso }));
  const quotedB = applyQuote(b, { price: mech ? 95 : clean ? 140 : 180, when: day(2) + 'T17:30', note: mech ? 'Diagnostic, then I will call with the fix price' : 'About 4 hours', now: iso });
  const bookedC = applyAccept(applyQuote(c, { price: mech ? 65 : clean ? 120 : 80, when: day(0) + 'T10:00', note: '', now: iso }), { now: iso });
  return [a, quotedB, bookedC];
}
