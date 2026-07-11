import type { ReactElement } from 'react';

import type { ReviewWorkspace } from '../graphql/operations.js';

import { formatJson } from './format.js';
import { CodeBlock, DefinitionList, EmptyLine, Panel } from './primitives.js';

interface SchemaPanelProps {
  workspace: ReviewWorkspace;
}

export function SchemaPanel({ workspace }: SchemaPanelProps): ReactElement {
  const intent = workspace.intent;
  const mapping = workspace.mapping;

  return (
    <div className="grid gap-dr-md xl:grid-cols-2">
      <Panel title="Intent Contract">
        {intent === null ? (
          <EmptyLine text="No intent contract data is available." />
        ) : (
          <div className="grid gap-dr-sm">
            <DefinitionList
              items={[
                ['componentName', intent.componentName],
                ['componentType', intent.componentType],
                ['props', Object.keys(intent.props).join(', ')],
                ['states', intent.states.join(', ')],
                ['sourceRefs', String(intent.sourceRefs.length)],
              ]}
            />
            <CodeBlock label="props" value={formatJson(intent.props)} />
          </div>
        )}
      </Panel>

      <Panel title="Shoelace Contract">
        {mapping === null ? (
          <EmptyLine text="No mapping contract data is available." />
        ) : (
          <div className="grid gap-dr-sm">
            <DefinitionList
              items={[
                ['targetComponent', mapping.targetComponent],
                ['mappedProps', Object.keys(mapping.mappedProps).join(', ')],
                ['mappedEvents', Object.keys(mapping.mappedEvents).join(', ')],
                ['mappedSlots', Object.keys(mapping.mappedSlots).join(', ')],
                ['mappedTokens', String(mapping.mappedTokens.length)],
              ]}
            />
            <CodeBlock label="mappedSlots" value={formatJson(mapping.mappedSlots)} />
          </div>
        )}
      </Panel>
    </div>
  );
}
