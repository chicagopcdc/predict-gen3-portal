# predict-gen3-portal

Gen3 frontend-framework (gen3ff) configuration for the PREDICT data commons.

This is a copy of the `config/` and `public/` directories from
[pcdc-gen3-portal](https://github.com/chicagopcdc/pcdc-gen3-portal), with
`config/gen3/explorer.json` rewritten for the `predict_test` Elasticsearch index
(Guppy type `subject`, config index `predict_test-array-config`).

## Frontend image

For now, use `quay.io/cdis/commons-frontend-app:main`. It is the frontend image
selected by the current `gen3-helm` chart and the local PREDICT setup. This
repository supplies `config/` and `public/`; the image supplies the frontend
application. Changes to these config and asset files can use the shared image.

For frontend customizations that require application code changes, such as new
components, layout, or behavior, create a PREDICT frontend based on the
`commons-frontend-app` template, build and publish a PREDICT-specific image, and
set `frontend-framework.image.repository` and `.tag` to that image. Config and
asset changes alone do not rebuild the frontend application.

For a reproducible deployment, replace the mutable `main` tag with a tested,
fixed image tag.

## Use with the gen3-helm `frontend-framework` chart

The chart's `customConfig` clones this repo and copies `config/` and `public/`
into the pod (`dir` is empty because they live at the repo root):

```yaml
frontend-framework:
  enabled: true
  image:
    repository: quay.io/cdis/commons-frontend-app
    tag: main
    pullPolicy: Always
  customConfig:
    enabled: true
    repo: https://github.com/chicagopcdc/predict-gen3-portal.git
    branch: main
    dir: ""
```

The repo is private, so the init container needs git credentials to clone it.

## Notes

- Flat fields (`data_contributor_id`, `data_source`, ...) and nested fields
  (`Demographics.sex`, `Treatment.medication_name`, ...) are listed in `explorer.json`.
  Update the field lists there when the index mapping changes.
- Other config files (`navigation.json`, `landingPage.json`, ...) are unmodified copies of the
  `gen3` set.
