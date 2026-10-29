import { useEffect, useState } from 'react';
import {
  isAuthenticated,
  selectCurrentCohort,
  useCoreSelector,
  useUserAuth,
} from '@gen3/core';

import {
  createFilterSet,
  listFilterSets,
  type FilterSetRecord,
} from '@/lib/filterSets/amanuensisClient';
import { cohortToFilterSetInput } from '@/lib/filterSets/cohortAdapter';
import SaveFilterSetModal, {
  type SaveFilterSetValues,
} from './SaveFilterSetModal';

const EXPLORER_ID = 1;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function SavedFilterSetsPanel() {
  const { data: user, loginStatus, isFetching } = useUserAuth();
  const currentCohort = useCoreSelector(selectCurrentCohort);
  const signedIn = isAuthenticated(loginStatus);
  const userKey = String(user?.id ?? user?.username ?? '');
  const [loadedUserKey, setLoadedUserKey] = useState<string | null>(null);
  const loading = signedIn && loadedUserKey !== userKey;

  const [savedSets, setSavedSets] = useState<FilterSetRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;

    void listFilterSets(EXPLORER_ID)
      .then((records) => {
        if (cancelled) return;
        setSavedSets(records);
        setError(null);
        setLoadedUserKey(userKey);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setSavedSets([]);
        setError(errorMessage(cause));
        setLoadedUserKey(userKey);
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn, userKey]);

  async function saveNewFilterSet(values: SaveFilterSetValues): Promise<void> {
    if (!signedIn || !currentCohort) {
      throw new Error('Sign in and select a cohort before saving.');
    }

    setError(null);
    setMessage(null);

    const id = await createFilterSet(
      EXPLORER_ID,
      cohortToFilterSetInput(currentCohort, values),
    );

    setMessage(`Saved "${values.name}" as filter set ${id}.`);

    try {
      setSavedSets(await listFilterSets(EXPLORER_ID));
    } catch (cause) {
      // The POST succeeded. Close the dialog so a retry does not create
      // a duplicate record.
      setError(`Saved, but the list could not refresh: ${errorMessage(cause)}`);
    }
  }

  return (
    <section
      aria-labelledby="saved-filter-sets-heading"
      className="mx-4 mt-4 rounded-md border bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="saved-filter-sets-heading" className="text-lg font-semibold">
          Saved Filter Sets
        </h2>

        <button
          type="button"
          onClick={() => setSaveModalOpen(true)}
          disabled={!signedIn || !currentCohort || loading}
          className="rounded bg-blue-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {'Save New Filter Set'}
        </button>
      </div>

      {(isFetching || loginStatus === 'pending') && (
        <p className="mt-2">Checking your sign-in status…</p>
      )}

      {!isFetching && !signedIn && loginStatus !== 'pending' && (
        <p className="mt-2">Sign in to save and view your filter sets.</p>
      )}

      {signedIn && loading && (
        <p className="mt-2">Loading saved filter sets…</p>
      )}

      {signedIn && !loading && savedSets.length === 0 && (
        <p className="mt-2">You have no saved filter sets yet.</p>
      )}

      {signedIn && !loading && savedSets.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {savedSets.map((record) => (
            <li key={record.id}>{record.name}</li>
          ))}
        </ul>
      )}

      {message && <output className="mt-2 text-green-700">{message}</output>}

      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      )}
      {saveModalOpen && (
        <SaveFilterSetModal
          opened
          cohort={currentCohort}
          existingNames={savedSets.map((record) => record.name)}
          onClose={() => setSaveModalOpen(false)}
          onSave={saveNewFilterSet}
        />
      )}
    </section>
  );
}