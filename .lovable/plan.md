# Fix: Dashboard time/date hydration mismatch

## Problem
`TimeAndGreeting` in `src/components/saps/dashboard-widgets.tsx` renders `new Date().toLocaleTimeString()` / `toLocaleDateString()` during SSR. The server uses UTC and the client uses the browser's local timezone, so React logs a hydration mismatch (e.g. server `03:33 PM` vs client `05:33 PM`) and re-renders the tree on every load of `/`.

The greeting (`Good morning/afternoon/evening`) has the same bug — it's derived from `date.getHours()`.

## Fix
Render the time, date, and time-based greeting **only after mount** so SSR output matches the initial client render.

- Add `const [mounted, setMounted] = useState(false)` and set true in the existing `useEffect`.
- Before mount: render stable placeholders — e.g. an empty tabular-nums span for time/date (reserving layout) and a generic greeting (`t.dashboard.welcomeGuest` for guests, `Welcome back${name ? ", " + name : ""}.` for signed-in users, avoiding hour-based branching).
- After mount: render the current `date · time` and time-appropriate greeting as today.

That's the only change — one component, ~10 lines. No other files touched.

## Verification
Reload `/`, confirm no hydration error in console, time still ticks every 30s.
