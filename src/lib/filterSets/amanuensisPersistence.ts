import type { Cohort } from '@gen3/core';

import {
  createFilterSet,
  deleteFilterSet,
  listFilterSets,
  updateFilterSet,
} from './amanuensisClient';
import {
  cohortToFilterSetInput,
  filterSetRecordToCohort,
} from './cohortAdapter';

type SavedRecord = {
  id: number;
  description: string;
};

export function createAmanuensisCohortStore(explorerId: number) {
  const saved = new Map<string, SavedRecord>();

  return {
    async load(): Promise<Cohort[]> {
      saved.clear();
      const records = await listFilterSets(explorerId);

      try {
        return records.map((record) => {
          const { amanuensisId, cohort } = filterSetRecordToCohort(record);

          saved.set(cohort.id, {
            id: amanuensisId,
            description: record.description ?? '',
          });

          return cohort;
        });
      } catch (error) {
        saved.clear();
        throw error;
      }
    },

    async save(cohort: Cohort, description?: string): Promise<Cohort> {
      const existing = saved.get(cohort.id);
      const savedDescription = description ?? existing?.description ?? '';

      const input = cohortToFilterSetInput(cohort, {
        name: cohort.name,
        description: savedDescription,
      });

      if (existing) {
        await updateFilterSet(explorerId, existing.id, input);
        saved.set(cohort.id, {
          id: existing.id,
          description: savedDescription,
        });
      } else {
        const id = await createFilterSet(explorerId, input);
        saved.set(cohort.id, { id, description: savedDescription });
      }

      return { ...cohort, saved: true, modified: false };
    },

    async remove(cohort: Cohort): Promise<void> {
      const existing = saved.get(cohort.id);
      if (!existing) return;

      await deleteFilterSet(explorerId, existing.id);
      saved.delete(cohort.id);
    },

    reset(): void {
      saved.clear();
    },
  };
}
