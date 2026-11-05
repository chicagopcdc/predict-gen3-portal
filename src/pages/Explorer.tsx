import AmanuensisCohortWorkspace from '../components/AmanuensisCohortWorkspace';
import { Center } from '@mantine/core';
import {
  ExplorerPageGetServerSideProps as getServerSideProps,
  NavPageLayout,
  type ExplorerPageProps,
} from '@gen3/frontend';


import { registerCohortTableCustomCellRenderers } from '@/lib/CohortBuilder/CustomCellRenderers';
import { registerCustomExplorerDetailsPanels } from '@/lib/CohortBuilder/FileDetailsPanel';

registerCohortTableCustomCellRenderers();
registerCustomExplorerDetailsPanels();

export default function ExplorerPage({
                                       headerProps,
                                       footerProps,
                                       explorerConfig,
                                       headerMetadata,
                                       tabsLayout,
                                       sharedFiltersMap,
                                     }: ExplorerPageProps) {
  if (explorerConfig === undefined) {
    return (
      <Center maw={400} h={100} mx="auto">
        <div>Explorer config is not defined. Page disabled</div>
      </Center>
    );
  }

  return (
    <NavPageLayout
      headerProps={headerProps}
      footerProps={footerProps}
      headerMetadata={headerMetadata}
    >
      <AmanuensisCohortWorkspace
        tabsLayout={tabsLayout}
        explorerConfig={explorerConfig}
        sharedFiltersMap={sharedFiltersMap}
      />
    </NavPageLayout>
  );
}

export { getServerSideProps };