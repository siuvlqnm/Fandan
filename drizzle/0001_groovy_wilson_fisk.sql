DROP INDEX `dishes_name_idx`;--> statement-breakpoint
CREATE INDEX `dishes_space_name_idx` ON `dishes` (`space_id`,`name`);--> statement-breakpoint
CREATE INDEX `dishes_space_category_idx` ON `dishes` (`space_id`,`category`);--> statement-breakpoint
CREATE INDEX `feedback_share_link_reaction_idx` ON `feedback` (`share_link_id`,`reaction`);--> statement-breakpoint
CREATE INDEX `meal_plan_items_plan_sort_idx` ON `meal_plan_items` (`meal_plan_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `meal_plan_items_plan_date_idx` ON `meal_plan_items` (`meal_plan_id`,`planned_date`);--> statement-breakpoint
CREATE INDEX `meal_plans_space_status_idx` ON `meal_plans` (`space_id`,`status`);--> statement-breakpoint
CREATE INDEX `meal_plans_space_start_date_idx` ON `meal_plans` (`space_id`,`start_date`);--> statement-breakpoint
CREATE INDEX `meal_targets_space_type_idx` ON `meal_targets` (`space_id`,`type`);--> statement-breakpoint
CREATE INDEX `shopping_list_items_list_checked_idx` ON `shopping_list_items` (`shopping_list_id`,`checked`);--> statement-breakpoint
CREATE INDEX `shopping_list_items_source_dish_idx` ON `shopping_list_items` (`source_dish_id`);--> statement-breakpoint
CREATE INDEX `spaces_owner_idx` ON `spaces` (`owner_user_id`);