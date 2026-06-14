# Mobile-First Redesign

This round repositions Fandan's UI around a mobile-first, share-confirmation workflow.

## Direction

The selected Product Design direction is `Shared Meal Room`:

- The first screen should make `分享确认` and `生成清单` feel like the core product value.
- Mobile browser is the primary surface; mini program and app are the next natural surfaces.
- PC layouts are compatibility views, not the design source of truth.
- Avoid default admin/dashboard styling, nested cards, toy-like colors, and engineering/MVP copy.

## Visual System

- Base: clean off-white/green-tinted page surface.
- Primary: service-product green for stable actions and navigation.
- Attention: restrained red for pending confirmation and share actions.
- Surfaces: rounded mobile panels with light borders and soft shadows.
- Navigation: app routes use a fixed mobile bottom nav.
- Typography: compact but readable mobile product scale, with 14-16px body text.

## Updated Surfaces

- Public home page now introduces the product through menu confirmation and shopping-list generation.
- Login page now reads as a mobile workspace entry instead of two plain auth cards.
- Creator dashboard now centers the pending-confirmation meal plan, participant confirmation state, share CTA, and three-step flow.
- Meal-plan list now uses mobile task-list rows with status emphasis.
- Meal-plan detail now separates menu, confirmation, shopping list and editing into focused mobile sections instead of showing every form at once.
- Shopping-list page now behaves like a mobile shopping checklist first, with editing collapsed behind details.
- Public share page now stands alone without the logged-in app header and focuses on guest feedback and confirmation.

## QA Evidence

- Design QA report: `design-qa.md`
- Reference direction: Product Design Image Gen option 3, `Shared Meal Room`.
- Local mobile screenshots are stored under `.codex-screenshots/` during this run.

## Follow-Up

- Redesign the remaining form-heavy creator pages next: new/edit meal plan, target forms and dish forms.
- Replace placeholder participant assumptions with real share/feedback participant state if the data model adds it.
- Consider a real shopping-list index route before making the bottom nav label `清单`.
