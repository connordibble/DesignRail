CREATE INDEX `compliance_findings_mapping_id_idx` ON `compliance_findings` (`mapping_id`);--> statement-breakpoint
CREATE INDEX `compliance_findings_severity_message_idx` ON `compliance_findings` (`severity`,`message`);--> statement-breakpoint
CREATE INDEX `component_intents_example_id_idx` ON `component_intents` (`example_id`);--> statement-breakpoint
CREATE INDEX `component_mappings_intent_id_idx` ON `component_mappings` (`intent_id`);--> statement-breakpoint
CREATE INDEX `exports_mapping_id_idx` ON `exports` (`mapping_id`);--> statement-breakpoint
CREATE INDEX `review_decisions_mapping_id_created_at_idx` ON `review_decisions` (`mapping_id`,`created_at`);
