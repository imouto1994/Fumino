import loadable from "@loadable/component";

export default loadable(() =>
  import(
    /* webpackChunkName: "page-digital", webpackPrefetch: true */ "../PageDigital"
  ),
);