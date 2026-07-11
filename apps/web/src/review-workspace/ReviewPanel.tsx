import { useMutation } from '@apollo/client/react';
import {
  getComponentSchema,
  getDefaultSlotLabel,
  listEditableProps,
  type ShoelaceComponentSchema,
  type ShoelaceProp,
} from '@designrail/schema';
import type { ReviewDecisionStatus } from '@designrail/shared';
import type { ReactElement } from 'react';
import { useState } from 'react';

import {
  REVIEW_WORKSPACE_QUERY,
  SAVE_REVIEW_DECISION_MUTATION,
  type ComplianceFindingResult,
  type ComponentMappingResult,
  type ReviewWorkspace,
  type SaveReviewDecisionMutation,
  type SaveReviewDecisionMutationVariables,
} from '../graphql/operations.js';
import { Button } from '../ui/Button.js';

import { ComplianceBand } from './CompliancePanels.js';
import {
  getComplianceSummary,
  getDecisionStatus,
  getDecisionSummary,
  getExportGateSummary,
} from './decision-presentation.js';
import {
  formatJson,
  formatMappedValue,
  formatTimestamp,
  getErrorMessage,
  humanizeLabel,
} from './format.js';
import {
  MAPPING_CONFIDENCE_OPTIONS,
  canSaveMappingEdit,
  createMappingEditDraft,
  createSaveDecisionInput,
  type MappingEditDraft,
} from './mapping-edit.js';
import {
  CodeBlock,
  DefinitionList,
  EmptyLine,
  InlineAlert,
  Panel,
  PillGroup,
  SelectField,
  StatusDot,
  TextField,
  TextareaField,
  TokenList,
} from './primitives.js';
import { cx, getToneTextClass, type Tone } from './workspace-tones.js';

interface ReviewPanelProps {
  exampleId: string;
  workspace: ReviewWorkspace;
}

export function ReviewPanel({ exampleId, workspace }: ReviewPanelProps): ReactElement {
  const intent = workspace.intent;
  const mapping = workspace.mapping;
  const schema = intent === null ? null : getComponentSchema(intent.componentType);
  const decisionStatus = getDecisionStatus(workspace.latestDecision);
  const [draft, setDraft] = useState<MappingEditDraft | null>(() =>
    schema === null || mapping === null
      ? null
      : createMappingEditDraft(schema, mapping, workspace.latestDecision),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveReviewDecision, saveDecisionState] = useMutation<
    SaveReviewDecisionMutation,
    SaveReviewDecisionMutationVariables
  >(SAVE_REVIEW_DECISION_MUTATION);
  const isSavingDecision = saveDecisionState.loading;

  async function persistDecision(
    status: ReviewDecisionStatus,
    notesOverride?: string,
  ): Promise<void> {
    if (schema === null || mapping === null || draft === null || isSavingDecision) {
      return;
    }

    const effectiveDraft = notesOverride === undefined ? draft : { ...draft, notes: notesOverride };
    const input = createSaveDecisionInput(schema, mapping.id, status, effectiveDraft);

    setSaveErrorMessage(null);

    try {
      await saveReviewDecision({
        variables: { input },
        refetchQueries: [{ query: REVIEW_WORKSPACE_QUERY, variables: { exampleId } }],
        awaitRefetchQueries: true,
      });
    } catch (error) {
      setSaveErrorMessage(getErrorMessage(error));
    }
  }

  function cancelEdit(): void {
    setDraft(
      schema === null || mapping === null
        ? null
        : createMappingEditDraft(schema, mapping, workspace.latestDecision),
    );
    setSaveErrorMessage(null);
    setIsEditing(false);
  }

  function cancelRejection(): void {
    setRejectionReason('');
    setSaveErrorMessage(null);
    setIsRejecting(false);
  }

  return (
    <div className="grid gap-dr-lg">
      {/* 1280–1535px: intent and mapping stack beside the sticky decision rail; the full
          three-column comparison needs ≥1536px to keep both panels readable. */}
      <div className="grid gap-dr-md xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-dr-md 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <Panel title="Source Intent">
            {intent === null ? (
              <EmptyLine text="No normalized component intent is available." />
            ) : (
              <div className="grid gap-dr-md">
                <p className="text-dr-body text-dr-text">{intent.summary}</p>
                <DefinitionList
                  items={[
                    ['Component', intent.componentName],
                    ['Type', intent.componentType],
                    ['Source', intent.source],
                    ['Accessibility', intent.accessibility.label ?? 'No accessible label'],
                  ]}
                />
                <PillGroup label="Variants" values={intent.variants} />
                <PillGroup label="States" values={intent.states} />
                <TokenList tokens={intent.tokenRefs} />
              </div>
            )}
          </Panel>

          <Panel title="Recommended Mapping">
            {mapping === null ? (
              <EmptyLine text="No Shoelace mapping is available." />
            ) : (
              <div className="grid gap-dr-md">
                <div className="flex flex-wrap items-baseline gap-x-dr-sm gap-y-dr-xxs">
                  <span className="font-mono text-dr-section-title text-dr-text">
                    {mapping.targetComponent}
                  </span>
                  <span className="text-dr-caption text-dr-subtle">
                    {mapping.targetLibrary} · {mapping.confidence} confidence
                  </span>
                </div>
                <DefinitionList items={buildMappingDisplayItems(mapping, schema)} />
                <CodeBlock label="mappedProps" value={formatJson(mapping.mappedProps)} />
                <p className="text-dr-small text-dr-muted">{mapping.rationale}</p>
              </div>
            )}
          </Panel>
        </div>

        <aside className="xl:sticky xl:top-dr-lg xl:self-start">
          <Panel className="shadow-dr-sm" density="compact" title="Decision">
            <div className="grid gap-dr-md">
              <RailStatusRows
                complianceFindings={workspace.complianceFindings}
                decisionStatus={decisionStatus}
              />

              {schema === null || mapping === null || draft === null ? (
                <EmptyLine text="No schema-backed mapping is available for a review decision." />
              ) : isEditing ? (
                <MappingEditor
                  disabled={isSavingDecision}
                  draft={draft}
                  onCancel={cancelEdit}
                  onChange={setDraft}
                  onSave={() => persistDecision('EDITED')}
                  schema={schema}
                />
              ) : isRejecting ? (
                <RejectionForm
                  disabled={isSavingDecision}
                  onCancel={cancelRejection}
                  onChange={setRejectionReason}
                  onConfirm={() => persistDecision('REJECTED', rejectionReason)}
                  reason={rejectionReason}
                />
              ) : (
                <DecisionActions
                  disabled={isSavingDecision}
                  onAccept={() => persistDecision('ACCEPTED')}
                  onEdit={() => setIsEditing(true)}
                  onReject={() => setIsRejecting(true)}
                />
              )}

              {isSavingDecision ? (
                <p aria-live="polite" className="text-dr-small text-dr-subtle" role="status">
                  Saving review decision…
                </p>
              ) : null}
              {saveErrorMessage !== null ? (
                <InlineAlert message={saveErrorMessage} title="Decision failed" />
              ) : null}

              {workspace.latestDecision === null ? (
                <EmptyLine text="No decision saved." />
              ) : (
                <DefinitionList
                  items={[
                    ['Reviewer', workspace.latestDecision.reviewerLabel],
                    ['Saved', formatTimestamp(workspace.latestDecision.createdAt)],
                    ['Notes', workspace.latestDecision.notes ?? 'No notes'],
                  ]}
                />
              )}
            </div>
          </Panel>
        </aside>
      </div>

      <ComplianceBand findings={workspace.complianceFindings} />
    </div>
  );
}

interface RailStatusRowsProps {
  complianceFindings: ComplianceFindingResult[];
  decisionStatus: ReviewDecisionStatus;
}

function RailStatusRows({ complianceFindings, decisionStatus }: RailStatusRowsProps): ReactElement {
  const decision = getDecisionSummary(decisionStatus);
  const exportGate = getExportGateSummary(decisionStatus);
  const compliance = getComplianceSummary(complianceFindings);

  return (
    <div className="grid gap-dr-sm">
      <div className="grid gap-dr-xxs">
        <div className="flex items-center gap-dr-xs">
          <StatusDot tone={decision.tone} />
          <p className={cx('text-dr-small font-semibold', getToneTextClass(decision.tone))}>
            {decision.label}
          </p>
        </div>
        <p className="text-dr-small text-dr-subtle">{decision.description}</p>
      </div>
      <dl className="grid gap-dr-xs border-t border-dr-border pt-dr-sm">
        <StatusRow label="Export" value={exportGate.label} tone={exportGate.tone} />
        <StatusRow label="Findings" value={compliance.label} tone={compliance.tone} />
      </dl>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  value: string;
  tone: Tone;
}

function StatusRow({ label, value, tone }: StatusRowProps): ReactElement {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-dr-sm">
      <dt className="text-dr-caption font-medium text-dr-subtle">{label}</dt>
      <dd
        className={cx(
          'flex items-center gap-dr-xs text-dr-small font-medium',
          getToneTextClass(tone),
        )}
      >
        <StatusDot tone={tone} />
        {value}
      </dd>
    </div>
  );
}

interface DecisionActionsProps {
  disabled: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}

function DecisionActions({
  disabled,
  onAccept,
  onEdit,
  onReject,
}: DecisionActionsProps): ReactElement {
  return (
    <div className="grid gap-dr-xs">
      <Button disabled={disabled} onClick={onAccept} variant="primary">
        Accept
      </Button>
      <div className="grid grid-cols-2 gap-dr-xs">
        <Button disabled={disabled} onClick={onEdit} variant="secondary">
          Edit
        </Button>
        <Button disabled={disabled} onClick={onReject} variant="danger">
          Reject
        </Button>
      </div>
    </div>
  );
}

interface RejectionFormProps {
  disabled: boolean;
  onCancel: () => void;
  onChange: (reason: string) => void;
  onConfirm: () => void;
  reason: string;
}

function RejectionForm({
  disabled,
  onCancel,
  onChange,
  onConfirm,
  reason,
}: RejectionFormProps): ReactElement {
  const canConfirm = reason.trim().length > 0;

  return (
    <div aria-label="Reject mapping" className="grid gap-dr-sm" role="group">
      <TextareaField
        disabled={disabled}
        id="rejection-reason"
        label="Rejection rationale"
        onChange={onChange}
        value={reason}
      />
      <p className="text-dr-caption text-dr-subtle">
        Recorded with the decision so the audit trail shows why the mapping was declined.
      </p>
      <div className="grid grid-cols-2 gap-dr-xs">
        <Button disabled={disabled || !canConfirm} onClick={onConfirm} variant="danger">
          Confirm rejection
        </Button>
        <Button disabled={disabled} onClick={onCancel} variant="secondary">
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface MappingEditorProps {
  disabled: boolean;
  draft: MappingEditDraft;
  onCancel: () => void;
  onChange: (draft: MappingEditDraft) => void;
  onSave: () => void;
  schema: ShoelaceComponentSchema;
}

function MappingEditor({
  disabled,
  draft,
  onCancel,
  onChange,
  onSave,
  schema,
}: MappingEditorProps): ReactElement {
  const canSave = canSaveMappingEdit(draft);

  function updateProp(name: string, value: string | boolean): void {
    onChange({ ...draft, props: { ...draft.props, [name]: value } });
  }

  function updateField<TKey extends 'slotLabel' | 'confidence' | 'rationale' | 'notes'>(
    key: TKey,
    value: MappingEditDraft[TKey],
  ): void {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div aria-label="Edit mapping" className="grid gap-dr-sm">
      <div className="grid gap-dr-sm">
        {draft.slotLabel === null ? null : (
          <TextField
            disabled={disabled}
            id="mapping-edit-slot-label"
            label={getDefaultSlotLabel(schema)}
            onChange={(value) => updateField('slotLabel', value)}
            value={draft.slotLabel}
          />
        )}
        {listEditableProps(schema).map((prop) => (
          <MappingPropField
            disabled={disabled}
            key={prop.name}
            onChange={(value) => updateProp(prop.name, value)}
            prop={prop}
            value={draft.props[prop.name] ?? (prop.kind === 'boolean' ? false : '')}
          />
        ))}
        <SelectField
          disabled={disabled}
          id="mapping-edit-confidence"
          label="Confidence"
          onChange={(value) => updateField('confidence', value)}
          options={MAPPING_CONFIDENCE_OPTIONS}
          value={draft.confidence}
        />
        <TextareaField
          disabled={disabled}
          id="mapping-edit-rationale"
          label="Rationale"
          onChange={(value) => updateField('rationale', value)}
          value={draft.rationale}
        />
        <TextareaField
          disabled={disabled}
          id="mapping-edit-notes"
          label="Notes"
          onChange={(value) => updateField('notes', value)}
          value={draft.notes}
        />
      </div>

      <div className="grid grid-cols-2 gap-dr-xs">
        <Button disabled={disabled || !canSave} onClick={onSave} variant="primary">
          Save changes
        </Button>
        <Button disabled={disabled} onClick={onCancel} variant="secondary">
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface MappingPropFieldProps {
  disabled: boolean;
  onChange: (value: string | boolean) => void;
  prop: ShoelaceProp;
  value: string | boolean;
}

function MappingPropField({
  disabled,
  onChange,
  prop,
  value,
}: MappingPropFieldProps): ReactElement {
  const label = humanizeLabel(prop.name);
  const fieldId = `mapping-edit-${prop.name}`;

  if (prop.kind === 'boolean') {
    return (
      <label className="flex items-center justify-between gap-dr-sm py-dr-xxs text-dr-small text-dr-muted">
        {label}
        <input
          checked={typeof value === 'boolean' ? value : false}
          className="size-4 accent-dr-accent focus-visible:outline focus-visible:outline-2"
          disabled={disabled}
          name={fieldId}
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
      </label>
    );
  }

  if (prop.kind === 'enum' && prop.values !== undefined) {
    return (
      <SelectField
        disabled={disabled}
        id={fieldId}
        label={label}
        onChange={onChange}
        options={prop.values}
        value={typeof value === 'string' ? value : ''}
      />
    );
  }

  return (
    <TextField
      disabled={disabled}
      id={fieldId}
      label={label}
      onChange={onChange}
      value={typeof value === 'string' ? value : ''}
    />
  );
}

/** Build the read-only mapping display rows directly from the mapped data. */
function buildMappingDisplayItems(
  mapping: ComponentMappingResult,
  schema: ShoelaceComponentSchema | null,
): Array<[string, string]> {
  const items: Array<[string, string]> = [];
  const slot = mapping.mappedSlots['default'];

  if (typeof slot === 'string') {
    items.push([schema === null ? 'Label' : getDefaultSlotLabel(schema), slot]);
  }

  for (const [key, value] of Object.entries(mapping.mappedProps)) {
    items.push([humanizeLabel(key), formatMappedValue(value)]);
  }

  return items;
}
