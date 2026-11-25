import { Data, Effect, Option, Schema } from 'effect';

/** Whether the last read or write of one storage key succeeded. */
export const StorageStatus = Schema.Literals(['Available', 'Blocked']);
export type StorageStatus = typeof StorageStatus.Type;

export type StorageArea = 'localStorage' | 'sessionStorage';

export class StorageUnavailable extends Data.TaggedError(
  'StorageUnavailable',
) {}

// Reading `window.localStorage` itself throws when the browser blocks storage.
const area = (name: StorageArea) => window[name];

export const readStorage = (name: StorageArea, key: string) =>
  Effect.try({
    try: () => Option.fromNullishOr(area(name).getItem(key)),
    catch: () => new StorageUnavailable(),
  });

export const writeStorage = (name: StorageArea, key: string, value: string) =>
  Effect.try({
    try: () => area(name).setItem(key, value),
    catch: () => new StorageUnavailable(),
  });

/** Reads one key at startup, and reports whether storage was available. */
export const readStorageAtStartup = (name: StorageArea, key: string) =>
  readStorage(name, key).pipe(
    Effect.map((maybeValue) => ({
      maybeValue,
      status: 'Available' as StorageStatus,
    })),
    Effect.catch(() =>
      Effect.succeed({
        maybeValue: Option.none<string>(),
        status: 'Blocked' as StorageStatus,
      }),
    ),
  );

export const isLocalStorageArea = (storageArea: Storage | null) => {
  try {
    return storageArea !== null && storageArea === window.localStorage;
  } catch {
    return false;
  }
};
