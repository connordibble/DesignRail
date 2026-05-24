import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const examples = sqliteTable('examples', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  componentType: text('component_type').notNull(),
  fixturePath: text('fixture_path').notNull(),
  source: text('source').notNull(),
  status: text('status').notNull(),
});

export const componentIntents = sqliteTable('component_intents', {
  id: text('id').primaryKey(),
  exampleId: text('example_id')
    .notNull()
    .references(() => examples.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  sourceRefsJson: text('source_refs_json').notNull(),
  componentName: text('component_name').notNull(),
  componentType: text('component_type').notNull(),
  summary: text('summary').notNull(),
  propsJson: text('props_json').notNull(),
  variantsJson: text('variants_json').notNull(),
  statesJson: text('states_json').notNull(),
  tokenRefsJson: text('token_refs_json').notNull(),
  accessibilityJson: text('accessibility_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const componentMappings = sqliteTable('component_mappings', {
  id: text('id').primaryKey(),
  intentId: text('intent_id')
    .notNull()
    .references(() => componentIntents.id, { onDelete: 'cascade' }),
  targetLibrary: text('target_library').notNull(),
  targetComponent: text('target_component').notNull(),
  mappedPropsJson: text('mapped_props_json').notNull(),
  mappedEventsJson: text('mapped_events_json').notNull(),
  mappedSlotsJson: text('mapped_slots_json').notNull(),
  mappedTokensJson: text('mapped_tokens_json').notNull(),
  confidence: text('confidence').notNull(),
  rationale: text('rationale').notNull(),
  fallbackNotes: text('fallback_notes'),
  createdAt: text('created_at').notNull(),
});

export const complianceFindings = sqliteTable('compliance_findings', {
  id: text('id').primaryKey(),
  mappingId: text('mapping_id')
    .notNull()
    .references(() => componentMappings.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  severity: text('severity').notNull(),
  message: text('message').notNull(),
  remediation: text('remediation').notNull(),
  path: text('path'),
  blocking: integer('blocking', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull(),
});

export const reviewDecisions = sqliteTable('review_decisions', {
  id: text('id').primaryKey(),
  mappingId: text('mapping_id')
    .notNull()
    .references(() => componentMappings.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  reviewerLabel: text('reviewer_label').notNull(),
  editedMappingJson: text('edited_mapping_json'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const exports = sqliteTable('exports', {
  id: text('id').primaryKey(),
  mappingId: text('mapping_id')
    .notNull()
    .references(() => componentMappings.id, { onDelete: 'cascade' }),
  format: text('format').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const instrumentationEvents = sqliteTable('instrumentation_events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  timestamp: text('timestamp').notNull(),
  metadataJson: text('metadata_json').notNull(),
});
