import {
  isFilterSet,
  buildCohortGqlOperator,
  type Cohort,
  type IndexedFilterSet,
} from '@gen3/core';

import type {
  FilterSetInput,
  FilterSetRecord,
} from './amanuensisClient';

const FORMAT = 'predict-cohort-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIndexedFilterSet(value: unknown): value is IndexedFilterSet {
  return isRecord(value) && Object.values(value).every(isFilterSet);
}

export function cohortToFilterSetInput(
  cohort: Cohort,
  { name, description }: Pick<FilterSetInput, 'name' | 'description'>,
): FilterSetInput {
  const gqlFilter = buildCohortGqlOperator(cohort.filters.subject);

  return {
    name,
    description,
    filters: {
      format: FORMAT,
      cohort: {
        id: cohort.id,
        filters: cohort.filters,
        createdDatetime: cohort.createdDatetime,
        modifiedDatetime: cohort.modifiedDatetime,
      },
    },
    ...(gqlFilter === undefined ? {} : { gqlFilter: { ...gqlFilter } }),
  };
}

export function filterSetRecordToCohort(
  record: FilterSetRecord,
): { amanuensisId: number; cohort: Cohort } {
  const data = record.filters;

  if (data.format !== FORMAT || !isRecord(data.cohort)) {
    throw new Error(`Filter set ${record.id} is not a PREDICT cohort.`);
  }

  const saved = data.cohort;

  if (
    typeof saved.id !== 'string' ||
    !isIndexedFilterSet(saved.filters) ||
    typeof saved.createdDatetime !== 'string' ||
    typeof saved.modifiedDatetime !== 'string'
  ) {
    throw new Error(`Filter set ${record.id} has invalid cohort data.`);
  }

  return {
    amanuensisId: record.id,
    cohort: {
      id: saved.id,
      name: record.name,
      filters: saved.filters,
      createdDatetime: saved.createdDatetime,
      modifiedDatetime: saved.modifiedDatetime,
      saved: true,
      modified: false,
      counts: {},
    },
  };
}