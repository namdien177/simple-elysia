ALTER TABLE `todo_buckets` DROP COLUMN `deleted_at`;--> statement-breakpoint
ALTER TABLE `todo_item_attachments` DROP COLUMN `deleted_at`;--> statement-breakpoint
ALTER TABLE `todo_items` DROP COLUMN `deleted_at`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `deleted_at`;