CREATE TABLE `compliance_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`mapping_id` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`remediation` text NOT NULL,
	`path` text,
	`blocking` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mapping_id`) REFERENCES `component_mappings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `component_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`example_id` text NOT NULL,
	`source` text NOT NULL,
	`source_refs_json` text NOT NULL,
	`component_name` text NOT NULL,
	`component_type` text NOT NULL,
	`summary` text NOT NULL,
	`props_json` text NOT NULL,
	`variants_json` text NOT NULL,
	`states_json` text NOT NULL,
	`token_refs_json` text NOT NULL,
	`accessibility_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`example_id`) REFERENCES `examples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `component_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`intent_id` text NOT NULL,
	`target_library` text NOT NULL,
	`target_component` text NOT NULL,
	`mapped_props_json` text NOT NULL,
	`mapped_events_json` text NOT NULL,
	`mapped_slots_json` text NOT NULL,
	`mapped_tokens_json` text NOT NULL,
	`confidence` text NOT NULL,
	`rationale` text NOT NULL,
	`fallback_notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`intent_id`) REFERENCES `component_intents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `examples` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`component_type` text NOT NULL,
	`fixture_path` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exports` (
	`id` text PRIMARY KEY NOT NULL,
	`mapping_id` text NOT NULL,
	`format` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mapping_id`) REFERENCES `component_mappings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `instrumentation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`metadata_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`mapping_id` text NOT NULL,
	`status` text NOT NULL,
	`reviewer_label` text NOT NULL,
	`edited_mapping_json` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mapping_id`) REFERENCES `component_mappings`(`id`) ON UPDATE no action ON DELETE cascade
);
