# Share Pages

LES-95 adds the public guest confirmation page at `/share/:token`.

The page is intentionally outside `/app`, does not require login and reads data through the LES-94 public share service. It uses the same Tailwind and shadcn-svelte components as the creator workspace, but keeps the layout narrower and more mobile-first for guests opening a link from chat.

## Route

`GET /share/:token`

Behavior:

- Shows meal-plan title, type, status, date range, target summary and dish count.
- Shows target taste notes, dietary restrictions and budget notes when present.
- Groups dishes by planned date and meal slot.
- Shows creator recommendation ratings on meal-plan items when present.
- Lets guests select `喜欢`, `不喜欢`, `想替换` or `备注` per dish.
- Lets guests add a freeform note per dish.
- Lets guests add a global dietary note.
- Lets guests confirm the meal plan with an optional note.
- Hides dish feedback controls when the share link disables feedback.
- Hides the final confirmation form when the share link disables confirmation.
- Shows success feedback after submitting feedback or confirmation.
- Shows an inline unavailable state for expired, missing or disabled share links, with an explicit expired-link message.

## Form Actions

`?/feedback`

Collects dish-level feedback and optional global dietary notes, then writes through `createShareFeedback`.

`?/confirm`

Writes confirmation through `confirmShare`. Confirmation also moves `draft` or `pending_confirmation` meal plans to `confirmed`.

## Visitor Boundaries

- No login is required.
- No `space_id`, user id or creator-only fields are exposed.
- Unknown links and expired links render a readable page-level error instead of the protected app shell.
- Feedback submission requires at least one dish reaction/note or a global dietary note.

## Handoff Notes

- LES-96 can build creator-side aggregation by reading the `feedback` rows created here.
- The creator meal-plan confirmation panel creates, copies, opens and disables the current share link.
- LES-110 exposes the existing share-link permissions in the creator panel: creators can allow feedback, allow final confirmation and choose permanent, 24-hour, 3-day, 7-day or custom expiry.
- Custom expiry dates close at 23:59 Asia/Shanghai and are stored as ISO timestamps in `share_links.expires_at`.
- Creating a new link disables older links for the same meal plan so only one visitor URL remains active.
- Confirmed or completed meal plans render a completed state and stop accepting additional visitor feedback or duplicate confirmations.
