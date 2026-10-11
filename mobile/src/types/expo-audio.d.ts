// expo-audio's shipped types don't surface the addListener/removeListener
// methods that AudioPlayer inherits at runtime from SharedObject/EventEmitter
// (expo-modules-core re-exports SharedObject as a `typeof globalThis.SharedObject`
// alias, which drops the generic event-map methods). This restores them so
// callers don't need to cast the player to `any`.
//
// The `export {}` makes this a module rather than a script, which is required
// for `declare module` below to augment expo-audio instead of replacing it.
export {};

declare module "expo-audio" {
  interface AudioPlayer {
    addListener(
      eventName: "playbackStatusUpdate",
      listener: (status: { didJustFinish: boolean; [key: string]: unknown }) => void
    ): { remove(): void };
  }
}
