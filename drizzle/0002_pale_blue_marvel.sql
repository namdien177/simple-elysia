ALTER TABLE `todo_buckets` ADD `created_at` text DEFAULT (current_timestamp) NOT NULL;--> statement-breakpoint
ALTER TABLE `todo_buckets` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `todo_buckets` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `todo_item_attachments` ADD `created_at` text DEFAULT (current_timestamp) NOT NULL;--> statement-breakpoint
ALTER TABLE `todo_item_attachments` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `todo_item_attachments` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `todo_items` ADD `created_at` text DEFAULT (current_timestamp) NOT NULL;--> statement-breakpoint
ALTER TABLE `todo_items` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `todo_items` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `created_at` text DEFAULT (current_timestamp) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` text;