// Workout app rules (no screen code here, so node can test it).
(function (root) {
  const uid = () => Math.random().toString(36).slice(2, 9);

  // ex: { name, sets, reps, unit: 'reps' | 'sec', weight: true/false, rest (seconds) }
  const E = (name, sets, reps, weight = true, unit = 'reps', rest = 90) => ({ name, sets, reps, unit, weight, rest });

  const STARTERS = [
    {
      key: 'gym', name: 'Gym: full body, 3 days a week', why: 'Two workouts you swap between. Good first plan for a gym.',
      days: [
        { name: 'Day A', ex: [E('Squat', 3, 8), E('Bench press', 3, 8), E('Barbell row', 3, 8), E('Plank', 3, 30, false, 'sec', 60)] },
        { name: 'Day B', ex: [E('Deadlift', 3, 5, true, 'reps', 120), E('Overhead press', 3, 8), E('Lat pulldown', 3, 10), E('Walking lunges', 3, 10)] },
      ],
    },
    {
      key: 'home', name: 'Home: no equipment', why: 'Nothing to buy. Do it in the living room.',
      days: [
        { name: 'Day A', ex: [E('Push-ups', 3, 10, false, 'reps', 60), E('Bodyweight squats', 3, 15, false, 'reps', 60), E('Glute bridge', 3, 12, false, 'reps', 60), E('Plank', 3, 30, false, 'sec', 60)] },
        { name: 'Day B', ex: [E('Lunges', 3, 10, false, 'reps', 60), E('Pike push-ups', 3, 8, false, 'reps', 60), E('Superman', 3, 12, false, 'reps', 60), E('Mountain climbers', 3, 30, false, 'sec', 60)] },
      ],
    },
    {
      key: 'ppl', name: 'Gym: push / pull / legs', why: 'Three workouts in a row. For 3 to 6 days a week.',
      days: [
        { name: 'Push', ex: [E('Bench press', 4, 8), E('Overhead press', 3, 10), E('Incline dumbbell press', 3, 10), E('Triceps pushdown', 3, 12, true, 'reps', 60)] },
        { name: 'Pull', ex: [E('Deadlift', 3, 5, true, 'reps', 120), E('Lat pulldown', 3, 10), E('Seated cable row', 3, 10), E('Dumbbell curl', 3, 12, true, 'reps', 60)] },
        { name: 'Legs', ex: [E('Squat', 4, 8, true, 'reps', 120), E('Leg press', 3, 10), E('Leg curl', 3, 12, true, 'reps', 60), E('Calf raise', 3, 15, true, 'reps', 60)] },
      ],
    },
  ];

  function planFrom(key) {
    const s = STARTERS.find(x => x.key === key) || STARTERS[0];
    return { id: uid(), name: s.name, days: s.days.map(d => ({ id: uid(), name: d.name, ex: d.ex.map(e => ({ ...e })) })) };
  }

  // Which day comes next: the one after the last finished workout of this plan.
  function nextDay(plan, history) {
    if (!plan || !plan.days.length) return null;
    const last = history.find(w => w.planId === plan.id);
    if (!last) return plan.days[0];
    const i = plan.days.findIndex(d => d.id === last.dayId);
    return plan.days[(i + 1) % plan.days.length];
  }

  // A new workout from a plan day: every set starts with last time's weight.
  function startWorkout(plan, day, history, now = Date.now()) {
    return {
      id: uid(), planId: plan.id, dayId: day.id, name: day.name, start: now, end: null,
      ex: day.ex.map(e => {
        const prev = lastFor(e.name, history);
        const sug = suggest(e, prev);
        return {
          name: e.name, unit: e.unit, weight: e.weight, rest: e.rest, target: e.reps,
          sets: Array.from({ length: e.sets }, () => ({ w: sug.w, r: e.reps, done: false })),
          tip: sug.tip,
        };
      }),
    };
  }

  // The most recent finished sets for an exercise name.
  function lastFor(name, history) {
    const n = name.trim().toLowerCase();
    for (const w of history) {
      const ex = w.ex.find(x => x.name.trim().toLowerCase() === n && x.sets.some(s => s.done));
      if (ex) return { when: w.end || w.start, ex };
    }
    return null;
  }

  // Simple coach: hit every rep last time? Add a little. Otherwise keep it.
  function suggest(e, prev) {
    if (!prev) return { w: e.weight ? '' : '', tip: 'First time: pick a weight you can do with good form.' };
    const done = prev.ex.sets.filter(s => s.done);
    const target = e.reps;
    const allHit = done.length >= e.sets && done.every(s => Number(s.r) >= target);
    const lastW = done.length ? Number(done[done.length - 1].w) || 0 : 0;
    if (!e.weight) {
      return { w: '', tip: allHit ? `You did all ${e.unit === 'sec' ? 'seconds' : 'reps'} last time. Try ${e.unit === 'sec' ? '5 more seconds' : '1 or 2 more reps'}.` : 'Same as last time. Beat one set.' };
    }
    if (!lastW) return { w: '', tip: 'Last time had no weight written down.' };
    if (allHit) {
      const add = lastW >= 135 && /squat|deadlift|leg press/i.test(e.name) ? 10 : 5;
      return { w: String(lastW + add), tip: `You hit every rep at ${lastW}. Today: ${lastW + add}.` };
    }
    return { w: String(lastW), tip: `Stay at ${lastW} until you hit every rep.` };
  }

  function summary(w) {
    const done = w.ex.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    const volume = w.ex.reduce((n, e) => n + (e.weight ? e.sets.filter(s => s.done).reduce((m, s) => m + (Number(s.w) || 0) * (Number(s.r) || 0), 0) : 0), 0);
    const mins = w.end ? Math.max(1, Math.round((w.end - w.start) / 60000)) : 0;
    return { sets: done, volume, mins };
  }

  // Workouts done this week (Monday start) and weeks in a row with at least one.
  function weekStart(t) {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }
  function stats(history, now = Date.now()) {
    const ws = weekStart(now);
    const thisWeek = history.filter(w => (w.end || w.start) >= ws).length;
    const weeks = new Set(history.map(w => weekStart(w.end || w.start)));
    let streak = 0, k = ws;
    if (!weeks.has(k)) k -= 7 * 864e5; // this week not started yet still keeps the streak
    while (weeks.has(k)) { streak++; k = weekStart(k - 3 * 864e5); }
    return { thisWeek, streak, total: history.length };
  }

  function best(name, history) {
    let top = 0;
    for (const w of history) for (const e of w.ex) if (e.name.toLowerCase() === name.toLowerCase())
      for (const s of e.sets) if (s.done) top = Math.max(top, Number(s.w) || 0);
    return top;
  }

  const api = { STARTERS, planFrom, nextDay, startWorkout, lastFor, suggest, summary, stats, weekStart, best, uid };
  if (typeof module !== 'undefined') module.exports = api; else root.WL = api;
})(this);
