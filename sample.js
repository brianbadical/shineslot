// Made-up requests for trying the app. Names, phones and addresses are fake.
import { makeRequest, applyQuote, applyAccept, localDay } from './logic.js';

export function sampleRequests(now, trade = 'detailing') {
  const iso = now.toISOString();
  const day = n => localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
  const mech = trade === 'mechanic';
  const rows = [
    { name: 'Jordan Sample', phone: '555-0101', vehicle: '2019 Honda CR-V', services: mech ? ['Brakes'] : ['Interior', 'Pet hair'], times: ['Saturday'], address: '100 Example St', notes: mech ? 'Squeals when I stop, worse in the morning.' : 'Dog hair everywhere, back seats mostly.' },
    { name: 'Casey Demo', email: 'casey@example.com', vehicle: '2015 Ford F-150', services: mech ? ['Check engine light'] : ['Full detail'], times: ['Weekday evenings'], address: '22 Sample Ave', notes: mech ? 'Light came on last week, runs fine.' : '' },
    { name: 'Riley Test', phone: '555-0103', vehicle: '2021 Toyota Camry', services: mech ? ['Oil change'] : ['Exterior'], times: ['Weekday mornings'], address: '7 Placeholder Rd', notes: '' },
  ];
  const [a, b, c] = rows.map((r, i) => makeRequest(mech ? { ...r, address: '' } : r, { trade, id: 'sample' + (i + 1) + Date.now().toString(36), now: iso }));
  const quotedB = applyQuote(b, { price: mech ? 95 : 180, when: day(2) + 'T17:30', note: mech ? 'Diagnostic, then I will call with the fix price' : 'About 4 hours', now: iso });
  const bookedC = applyAccept(applyQuote(c, { price: mech ? 65 : 80, when: day(0) + 'T10:00', note: '', now: iso }), { now: iso });
  return [a, quotedB, bookedC];
}
