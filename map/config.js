// Put You on the Map site settings. Brian fills these in before going live.
window.PYOTM = {
  price: 49, // 0 = free mode
  // Customers pay AFTER the listing is fixed. This link goes in the "all done" email, not on the sign-up page.
  payLink: 'https://www.paypal.me/brianbadical/49USD',
  payAfterDone: true,
  // Same free Supabase project as ShineSlot. The publishable key is meant to be public.
  supabaseUrl: 'https://ndjuxkuwgxvgrkxgblni.supabase.co',
  supabaseKey: 'sb_publishable_btWNzQJywjlfNeUF5PLF-g_8JJ-eFDj',
  // Leave false until supabase/map-signups.sql has been run. While false, sign-ups stay in the browser (test mode).
  online: true,
  // Count opens of the free check link. Turn on only after supabase/map-visits.sql has been run.
  countVisits: true,
  contactEmail: 'thebrainsmith@gmail.com',
  postalAddress: '',
};
