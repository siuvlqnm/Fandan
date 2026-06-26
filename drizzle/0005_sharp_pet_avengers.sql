ALTER TABLE `dishes` ADD `created_by_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `dishes` ADD `updated_by_user_id` text REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `dishes_created_by_idx` ON `dishes` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `dishes_updated_by_idx` ON `dishes` (`updated_by_user_id`);--> statement-breakpoint
ALTER TABLE `meal_plan_items` ADD `created_by_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `meal_plan_items` ADD `updated_by_user_id` text REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `meal_plan_items_created_by_idx` ON `meal_plan_items` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `meal_plan_items_updated_by_idx` ON `meal_plan_items` (`updated_by_user_id`);--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `created_by_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `meal_plans` ADD `updated_by_user_id` text REFERENCES user(id);--> statement-breakpoint
CREATE INDEX `meal_plans_created_by_idx` ON `meal_plans` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `meal_plans_updated_by_idx` ON `meal_plans` (`updated_by_user_id`);--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `created_by_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `updated_by_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `checked_by_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `shopping_list_items` ADD `checked_at` text;--> statement-breakpoint
CREATE INDEX `shopping_list_items_created_by_idx` ON `shopping_list_items` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `shopping_list_items_updated_by_idx` ON `shopping_list_items` (`updated_by_user_id`);--> statement-breakpoint
CREATE INDEX `shopping_list_items_checked_by_idx` ON `shopping_list_items` (`checked_by_user_id`);