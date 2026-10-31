import { createContext, useContext } from "react";

export const ContentViewportContext = createContext({
  width: null as number | null,
  navigationRail: false,
});

export function useContentViewport() {
  return useContext(ContentViewportContext);
}
