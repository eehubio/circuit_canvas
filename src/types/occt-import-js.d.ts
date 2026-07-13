declare module 'occt-import-js' {
  const init: (opts?: { locateFile?: (f: string) => string }) => Promise<unknown>;
  export default init;
}
declare module 'occt-import-js/dist/occt-import-js.wasm?url' {
  const url: string;
  export default url;
}
