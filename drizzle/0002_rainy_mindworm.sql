CREATE TABLE `space_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`token` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by_user_id` text,
	`accepted_by_user_id` text,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "space_invitations_role_check" CHECK("space_invitations"."role" in ('owner', 'member')),
	CONSTRAINT "space_invitations_status_check" CHECK("space_invitations"."status" in ('pending', 'accepted', 'revoked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `space_invitations_token_unique` ON `space_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `space_invitations_space_status_idx` ON `space_invitations` (`space_id`,`status`);--> statement-breakpoint
CREATE INDEX `space_invitations_invited_by_idx` ON `space_invitations` (`invited_by_user_id`);--> statement-breakpoint
CREATE INDEX `space_invitations_accepted_by_idx` ON `space_invitations` (`accepted_by_user_id`);--> statement-breakpoint
CREATE INDEX `space_invitations_expires_at_idx` ON `space_invitations` (`expires_at`);--> statement-breakpoint
CREATE TABLE `space_members` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "space_members_role_check" CHECK("space_members"."role" in ('owner', 'member')),
	CONSTRAINT "space_members_status_check" CHECK("space_members"."status" in ('active', 'left', 'removed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `space_members_space_user_unique` ON `space_members` (`space_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `space_members_owner_unique` ON `space_members` (`space_id`) WHERE "space_members"."role" = 'owner';--> statement-breakpoint
CREATE INDEX `space_members_user_status_idx` ON `space_members` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `space_members_space_status_idx` ON `space_members` (`space_id`,`status`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`current_space_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `user_preferences_current_space_idx` ON `user_preferences` (`current_space_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `space_members` (
	`id`,
	`space_id`,
	`user_id`,
	`role`,
	`status`,
	`joined_at`,
	`created_at`,
	`updated_at`
)
SELECT
	lower(hex(randomblob(16))),
	`spaces`.`id`,
	`spaces`.`owner_user_id`,
	'owner',
	'active',
	`spaces`.`created_at`,
	`spaces`.`created_at`,
	`spaces`.`updated_at`
FROM `spaces`
INNER JOIN `user` ON `user`.`id` = `spaces`.`owner_user_id`;
--> statement-breakpoint
INSERT OR IGNORE INTO `user_preferences` (`user_id`, `current_space_id`)
SELECT `spaces`.`owner_user_id`, `spaces`.`id`
FROM `spaces`
INNER JOIN `user` ON `user`.`id` = `spaces`.`owner_user_id`
WHERE `spaces`.`id` = (
	SELECT `primary_space`.`id`
	FROM `spaces` AS `primary_space`
	WHERE `primary_space`.`owner_user_id` = `spaces`.`owner_user_id`
	ORDER BY `primary_space`.`created_at`, `primary_space`.`id`
	LIMIT 1
);
