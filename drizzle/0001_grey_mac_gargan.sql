CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` varchar(1000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_followerId_followingId_pk` PRIMARY KEY(`followerId`,`followingId`)
);
--> statement-breakpoint
CREATE TABLE `hashtags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hashtags_id` PRIMARY KEY(`id`),
	CONSTRAINT `hashtags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `likes_userId_postId_pk` PRIMARY KEY(`userId`,`postId`)
);
--> statement-breakpoint
CREATE TABLE `postHashtags` (
	`postId` int NOT NULL,
	`hashtagId` int NOT NULL,
	CONSTRAINT `postHashtags_postId_hashtagId_pk` PRIMARY KEY(`postId`,`hashtagId`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` varchar(255) NOT NULL,
	`caption` text,
	`visibility` enum('public') NOT NULL DEFAULT 'public',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`userId` int NOT NULL,
	`handle` varchar(40) NOT NULL,
	`displayName` varchar(80) NOT NULL,
	`fursonaName` varchar(80),
	`bio` text,
	`avatarUrl` text,
	`avatarKey` varchar(255),
	`isCreator` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `profiles_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_followerId_users_id_fk` FOREIGN KEY (`followerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_followingId_users_id_fk` FOREIGN KEY (`followingId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `likes` ADD CONSTRAINT `likes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `likes` ADD CONSTRAINT `likes_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `postHashtags` ADD CONSTRAINT `postHashtags_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `postHashtags` ADD CONSTRAINT `postHashtags_hashtagId_hashtags_id_fk` FOREIGN KEY (`hashtagId`) REFERENCES `hashtags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `comments_post_created_idx` ON `comments` (`postId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `follows_following_idx` ON `follows` (`followingId`);--> statement-breakpoint
CREATE INDEX `likes_post_idx` ON `likes` (`postId`);--> statement-breakpoint
CREATE INDEX `posts_author_created_idx` ON `posts` (`authorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `profiles_handle_idx` ON `profiles` (`handle`);