export const DESIGNRAIL_GRAPHQL_SCHEMA = String.raw`
  scalar JSON

  enum ComponentSource {
    MOCK
    FIGMA
  }

  enum ExampleStatus {
    READY
    DISABLED
  }

  enum TargetLibrary {
    SHOELACE
  }

  enum MappingConfidence {
    HIGH
    MEDIUM
    LOW
  }

  enum ComplianceCategory {
    ACCESSIBILITY
    TOKEN_USAGE
    VARIANT_COVERAGE
    REACT_READINESS
    DOCUMENTATION_READINESS
    DESIGN_SYSTEM_ALIGNMENT
  }

  enum ComplianceSeverity {
    BLOCKER
    WARNING
    INFO
  }

  enum ReviewDecisionStatus {
    PENDING
    ACCEPTED
    REJECTED
    EDITED
  }

  enum ExportFormat {
    HTML
    REACT
    AGENT_BRIEF
  }

  type Example {
    id: ID!
    name: String!
    componentType: String!
    fixturePath: String!
    source: ComponentSource!
    status: ExampleStatus!
    latestDecisionStatus: ReviewDecisionStatus!
    complianceSummary: ComplianceSeverityCounts!
  }

  type ComplianceSeverityCounts {
    blockers: Int!
    warnings: Int!
    info: Int!
  }

  type SourceReference {
    type: String!
    id: String!
    name: String
  }

  type TokenReference {
    name: String!
    value: String
    target: String
  }

  type AccessibilityMetadata {
    label: String
    role: String
    description: String
    required: Boolean!
  }

  type ComponentIntent {
    id: ID!
    exampleId: ID!
    source: ComponentSource!
    sourceRefs: [SourceReference!]!
    componentName: String!
    componentType: String!
    summary: String!
    props: JSON!
    variants: [String!]!
    states: [String!]!
    tokenRefs: [TokenReference!]!
    accessibility: AccessibilityMetadata!
    createdAt: String!
  }

  type ComponentMapping {
    id: ID!
    intentId: ID!
    targetLibrary: TargetLibrary!
    targetComponent: String!
    mappedProps: JSON!
    mappedEvents: JSON!
    mappedSlots: JSON!
    mappedTokens: [TokenReference!]!
    confidence: MappingConfidence!
    rationale: String!
    fallbackNotes: String
    createdAt: String!
  }

  type ComplianceFinding {
    id: ID!
    mappingId: ID!
    category: ComplianceCategory!
    severity: ComplianceSeverity!
    message: String!
    remediation: String!
    path: String
    blocking: Boolean!
    createdAt: String!
  }

  type ComplianceLedgerEntry {
    example: Example!
    finding: ComplianceFinding!
  }

  type ReviewDecision {
    id: ID!
    mappingId: ID!
    status: ReviewDecisionStatus!
    reviewerLabel: String!
    editedMapping: JSON
    notes: String
    createdAt: String!
  }

  type ExportResult {
    id: ID!
    mappingId: ID!
    format: ExportFormat!
    content: String!
    createdAt: String!
  }

  type DashboardWarning {
    message: String!
    count: Int!
  }

  type DashboardMetrics {
    acceptedMappings: Int!
    rejectedMappings: Int!
    editedMappings: Int!
    pendingMappings: Int!
    exportsCreated: Int!
    commonComplianceWarnings: [DashboardWarning!]!
  }

  type ReviewWorkspace {
    example: Example!
    intent: ComponentIntent
    mapping: ComponentMapping
    complianceFindings: [ComplianceFinding!]!
    latestDecision: ReviewDecision
    decisionHistory: [ReviewDecision!]!
    exports: [ExportResult!]!
  }

  input TokenReferenceInput {
    name: String!
    value: String
    target: String
  }

  input MappingEditInput {
    targetComponent: String
    mappedProps: JSON
    mappedEvents: JSON
    mappedSlots: JSON
    mappedTokens: [TokenReferenceInput!]
    confidence: MappingConfidence
    rationale: String
    fallbackNotes: String
  }

  input SaveReviewDecisionInput {
    mappingId: ID!
    status: ReviewDecisionStatus!
    reviewerLabel: String!
    editedMapping: MappingEditInput
    notes: String
  }

  input ExportMappingInput {
    mappingId: ID!
    format: ExportFormat!
  }

  type Query {
    examples(limit: Int = 50): [Example!]!
    componentIntent(exampleId: ID!): ComponentIntent
    mapping(exampleId: ID!): ComponentMapping
    compliance(mappingId: ID!, limit: Int = 50): [ComplianceFinding!]!
    reviewDecisions(limit: Int = 100): [ReviewDecision!]!
    complianceLedger(limit: Int = 200): [ComplianceLedgerEntry!]!
    dashboardMetrics: DashboardMetrics!
    reviewWorkspace(exampleId: ID!): ReviewWorkspace
  }

  type Mutation {
    saveReviewDecision(input: SaveReviewDecisionInput!): ReviewDecision!
    exportMapping(input: ExportMappingInput!): ExportResult!
  }
`;
