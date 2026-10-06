ALTER TABLE `posts` MODIFY COLUMN `imageUrl` text;--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `imageKey` varchar(255);--> statement-breakpoint
ALTER TABLE `posts` ADD `mediaType` enum('text','image','video') DEFAULT 'text' NOT NULL;