ALTER TABLE `dishes` ADD `base_servings` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `dishes` ADD `serving_basis_confirmed` integer DEFAULT false NOT NULL;