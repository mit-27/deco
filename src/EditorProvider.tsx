import { ComponentChildren, createContext } from "preact";
import { useContext } from "preact/hooks";
import type { PageComponentData, Schemas } from "../types.ts";

interface Props {
  components: PageComponentData[];
  template: string;
  componentSchemas: Schemas;
  siteId: number;
}

export interface EditorContext extends Props {}

export const EditorContext = createContext<EditorContext>(
  undefined as unknown as EditorContext,
);

export const useEditor = () => useContext(EditorContext);

export default function EditorProvider(
  { children, components, template, componentSchemas, siteId, draftId }:
    & Props
    & {
      children: ComponentChildren;
    },
) {
  return (
    <EditorContext.Provider
      value={{
        components,
        template,
        componentSchemas,
        siteId,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
