CREATE TABLE `userIdentities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerSubject` varchar(255) NOT NULL,
	`provider` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userIdentities_id` PRIMARY KEY(`id`),
	CONSTRAINT `userIdentities_providerSubject_unique` UNIQUE(`providerSubject`)
);
--> statement-breakpoint
ALTER TABLE `userIdentities` ADD CONSTRAINT `userIdentities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `userIdentities_user_idx` ON `userIdentities` (`userId`);