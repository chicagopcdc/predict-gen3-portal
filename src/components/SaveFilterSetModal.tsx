import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import type { Cohort, Operation } from '@gen3/core';

export interface SaveFilterSetValues {
  name: string;
  description: string;
}

interface SaveFilterSetModalProps {
  opened: boolean;
  cohort?: Cohort;
  existingNames: readonly string[];
  fieldLabels?: Record<string, string>;
  onClose: () => void;
  onSave: (values: SaveFilterSetValues) => Promise<void>;
}

function fieldLabel(field: string, labels: Record<string, string>): string {
  return (
    labels[field] ?? field.split('.').at(-1)?.replaceAll('_', ' ') ?? field
  );
}

function displayValue(value: string | number | boolean): string {
  return typeof value === 'string' ? `"${value}"` : String(value);
}

function describeOperation(
  operation: Operation,
  labels: Record<string, string>,
): string {
  switch (operation.operator) {
    case 'and':
    case 'or': {
      const parts = operation.operands
        .map((operand) => describeOperation(operand, labels))
        .filter(Boolean);
      return parts.join(operation.operator === 'and' ? ' AND ' : ' OR ');
    }

    case 'nested':
      return describeOperation(operation.operand, labels);

    case 'in':
    case 'includes':
    case 'excludes':
    case 'excludeifany': {
      if (operation.operands.length === 0) return '';

      const action =
        operation.operator === 'excludes' ||
        operation.operator === 'excludeifany'
          ? 'excludes'
          : 'includes any of';

      const values = operation.operands.map(displayValue).join(', ');
      return `${fieldLabel(operation.field, labels)} ${action} ${values}`;
    }

    case 'exists':
      return `${fieldLabel(operation.field, labels)} exists`;

    case 'missing':
      return `${fieldLabel(operation.field, labels)} is missing`;

    default:
      return (
        `${fieldLabel(operation.field, labels)} ` +
        `${operation.operator} ${displayValue(operation.operand)}`
      );
  }
}

function filterPreview(
  cohort: Cohort | undefined,
  labels: Record<string, string>,
): string[] {
  if (!cohort) return [];

  const indexedFilters = Object.entries(cohort.filters);

  return indexedFilters.flatMap(([index, filterSet]) => {
    const parts = Object.values(filterSet.root)
      .map((operation) => describeOperation(operation, labels))
      .filter(Boolean);

    if (parts.length === 0) return [];

    const summary = parts.join(filterSet.mode === 'or' ? ' OR ' : ' AND ');

    return [indexedFilters.length > 1 ? `${index}: ${summary}` : summary];
  });
}

export default function SaveFilterSetModal({
                                             opened,
                                             cohort,
                                             existingNames,
                                             fieldLabels = {},
                                             onClose,
                                             onSave,
                                           }: SaveFilterSetModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const preview = filterPreview(cohort, fieldLabels);
  const duplicateName = existingNames.some(
    (existing) => existing.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  const canSave =
    Boolean(cohort) &&
    trimmedName.length > 0 &&
    !duplicateName &&
    preview.length > 0 &&
    !saving;

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: trimmedName,
        description: description.trim(),
      });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save filter set.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Save as a new Filter Set"
      centered
      size="md"
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
    >
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Enter the Filter Set name"
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value);
            setError(null);
          }}
          error={
            duplicateName && trimmedName
              ? 'A filter set with this name already exists.'
              : undefined
          }
          required
        />

        <Textarea
          label="Description"
          placeholder="Describe the Filter Set (optional)"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          minRows={3}
        />

        <div>
          <Text fw={500} mb="xs">
            Filters
          </Text>
          <Paper withBorder p="sm">
            {preview.length > 0 ? (
              <Stack gap="xs">
                {preview.map((summary, index) => (
                  <Text size="sm" key={`${index}-${summary}`}>
                    {summary}
                  </Text>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Apply a filter before saving a filter set.
              </Text>
            )}
          </Paper>
        </div>

        {error && (
          <Text role="alert" size="sm" c="red">
            {error}
          </Text>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose} disabled={saving}>
            Back to page
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!canSave}
            loading={saving}
          >
            Save Filter Set
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
