import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Center, Button } from '@mantine/core';
import {
  coreStore,
  createNewCohort,
  selectCohortById,
  selectCurrentCohort,
  setCohortList,
  setCurrentCohortId,
  useCoreDispatch,
  useCoreSelector,
  useUserAuth,
  type Cohort,
} from '@gen3/core';
import type { ExplorerPageProps } from '@gen3/frontend';

import { createAmanuensisCohortStore } from '@/lib/filterSets/amanuensisPersistence';

const CohortManager = dynamic(
  () => import('@gen3/frontend').then((module) => module.CohortManager),
  { ssr: false },
);

const CohortBuilder = dynamic(
  () => import('@gen3/frontend').then((module) => module.CohortBuilder),
  { ssr: false },
);

type Props = Pick<
  ExplorerPageProps,
  'explorerConfig' | 'tabsLayout' | 'sharedFiltersMap'
>;

type Store = ReturnType<typeof createAmanuensisCohortStore>;

const EXPLORER_ID = 1;

export default function AmanuensisCohortWorkspace({
                                                    explorerConfig,
                                                    tabsLayout,
                                                    sharedFiltersMap,
                                                  }: Props) {
  const dispatch = useCoreDispatch();
  const { data, loginStatus, isUninitialized, isFetching } = useUserAuth();

  const username = loginStatus === 'authenticated' ? data?.username : undefined;
  const authReady = !isUninitialized && !isFetching;
  const ownerKey = username ?? 'anonymous';

  // The Save and Delete actions will use this store in the next step.
  const storeRef = useRef<Store | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentCohort = useCoreSelector(selectCurrentCohort);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    const store = createAmanuensisCohortStore(EXPLORER_ID);
    storeRef.current = store;
    setLoadedOwner(null);
    setLoadError(null);
    setSaving(false);
    setSaveError(null);

    const replaceCohorts = (cohorts: Cohort[]) => {
      // Gen3's setCohortList([]) only upserts; a null payload clears it.
      dispatch({ type: setCohortList.type, payload: null });

      if (cohorts.length > 0) {
        dispatch(setCohortList(cohorts));
        dispatch(setCurrentCohortId(cohorts[0].id));
      } else {
        dispatch(createNewCohort({ name: 'Cohort', setAsCurrent: true }));
      }
    };

    if (!username) {
      replaceCohorts([]);
      setLoadedOwner(ownerKey);
    } else {
      void store
        .load()
        .then((cohorts) => {
          if (cancelled) return;
          replaceCohorts(cohorts);
          setLoadedOwner(ownerKey);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setLoadError(error instanceof Error ? error.message : String(error));
        });
    }

    return () => {
      cancelled = true;
      if (storeRef.current === store) storeRef.current = null;
      store.reset();
    };
  }, [authReady, username, ownerKey, dispatch]);

  const handleSave = async () => {
    const store = storeRef.current;
    if (!store || !username || !currentCohort || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      const snapshot = currentCohort;
      const savedCohort = await store.save(snapshot);

      if (storeRef.current === store) {
        const latest = selectCohortById(coreStore.getState(), snapshot.id);
        if (latest) {
          const changedWhileSaving =
            latest.name !== snapshot.name ||
            latest.modifiedDatetime !== snapshot.modifiedDatetime ||
            latest.filters !== snapshot.filters;

          dispatch(
            setCohortList([
              changedWhileSaving
                ? { ...latest, saved: true, modified: true }
                : savedCohort,
            ]),
          );
        }
      }
    } catch (error) {
      if (storeRef.current === store) {
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (storeRef.current === store) setSaving(false);
    }
  };

  if (loadError) {
    return <div role="alert">Could not load filter sets: {loadError}</div>;
  }

  if (!authReady || loadedOwner !== ownerKey) {
    return <Center py="lg">Loading filter sets…</Center>;
  }

  return (
    <div className="flex w-full flex-col">
      <CohortManager
        showDefaultActions={{
          rename: true,
          create: true,
          duplicate: true,
          delete: false,
        }}
        customActions={
          <Button
            size="compact-md"
            variant="action"
            disabled={!username || !currentCohort || saving}
            loading={saving}
            onClick={() => void handleSave()}
          >
            {currentCohort?.saved ? 'Update Filter Set' : 'Save Filter Set'}
          </Button>
        }
      />
      {saveError && <div role="alert">{saveError}</div>}
      <CohortBuilder
        enableCohortManager={false}
        tabsLayout={tabsLayout}
        explorerConfig={explorerConfig}
        sharedFiltersMap={sharedFiltersMap}
      />
    </div>
  );
}
