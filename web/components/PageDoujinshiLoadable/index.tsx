import loadable from "@loadable/component";

export default loadable(() =>
  import(
    /* webpackChunkName: "page-doujinshi", webpackPrefetch: true */ "../PageDoujinshi"
  ),
);