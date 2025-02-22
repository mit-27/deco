/// <reference no-default-lib="true"/>
/// <reference lib="deno.ns" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { dirname, join } from "@std/path";

import { fromFileUrl, toFileUrl } from "@std/path";
import { ImportMapBuilder } from "../importmap/builder.ts";
import { parsePath } from "./parser.ts";
import { type Schemeable, typeNameToSchemeable } from "./transform.ts";

const folder = dirname(fromFileUrl(import.meta.url));
const file = "schemeable.test.types.ts";
const path = toFileUrl(join(folder, file)).toString();

export interface TestCase {
  path: string;
  typeName: string;
}

const testCases: TestCase[] = [
  {
    path,
    typeName: "SimpleType",
  },
  {
    path,
    typeName: "SimpleInterface",
  },
  {
    path,
    typeName: "NonRequiredFields",
  },
  {
    path,
    typeName: "UnionTypes",
  },
  {
    path,
    typeName: "ArrayFields",
  },
  {
    path,
    typeName: "InterfaceWithTypeRef",
  },
  {
    path,
    typeName: "WithTags",
  },
  {
    path,
    typeName: "TypeAlias",
  },
  {
    path,
    typeName: "TwoRefsProperties",
  },
  {
    path,
    typeName: "WellKnown",
  },
];
const getSchemeableDenoAST = async (
  path: string,
  name: string,
): Promise<Schemeable | undefined> => {
  const ast = await parsePath(path);
  return await typeNameToSchemeable(name, {
    path,
    parsedSource: ast!,
    importMapResolver: ImportMapBuilder.new(),
  });
};

Deno.bench(
  "transform to schemeable using deno_ast",
  { group: "schema_gen", baseline: true },
  async () => {
    localStorage.clear();

    await Promise.all(testCases.map(({ path, typeName }) => {
      return getSchemeableDenoAST(path, typeName);
    }));
  },
);
