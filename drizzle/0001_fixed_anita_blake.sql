CREATE TABLE `todo_buckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`public` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `todo_item_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`todo_item_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`data` blob
);
--> statement-breakpoint
CREATE TABLE `todo_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_id` integer NOT NULL,
	`parent_id` integer,
	`content` text NOT NULL,
	`done` integer NOT NULL
);
