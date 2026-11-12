import { indexedDB, IDBKeyRange } from "fake-indexeddb";
Object.defineProperty(globalThis, "indexedDB", {
  value: indexedDB,
  configurable: true,
});
Object.defineProperty(globalThis, "IDBKeyRange", {
  value: IDBKeyRange,
  configurable: true,
});
