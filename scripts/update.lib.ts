import { parse } from "https://deno.land/std@0.204.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.204.0/fmt/colors.ts";
import { join } from "https://deno.land/std@0.204.0/path/mod.ts";
import * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";
import {
  lookup,
  REGISTRIES,
} from "https://denopkg.com/hayd/deno-udd@0.8.2/registry.ts";
import denoJSON from "../deno.json" with { type: "json" };
import { stringifyForWrite } from "../utils/json.ts";
import { pkgInfo } from "../utils/pkg.ts";
// map of `packageAlias` to `packageRepo`
const PACKAGES_TO_CHECK =
  /(apps)|(deco)|(\$live)|(deco-sites\/.*\/$)|(partytown)/;

const requiredMinVersion: Record<string, string> = {
  // "std/": "0.208.0",
};
interface ImportMap {
  imports: Record<string, string>;
}

const flags = parse(Deno.args, {
  boolean: ["allow-pre"],
});

const getImportMap = async (dir: string): Promise<[ImportMap, string]> => {
  const denoJSONPath = join(dir, "deno.json");
  const denoJSON = await Deno.readTextFile(denoJSONPath).then(JSON.parse);
  // inlined import_map inside deno.json
  if (denoJSON.imports) {
    return [denoJSON, denoJSONPath];
  }

  const importMapFile = denoJSON?.importMap ?? "./import_map.json";
  const importMapPath = join(dir, importMapFile.replace("./", ""));
  return [
    await Deno.readTextFile(importMapPath).then(JSON.parse),
    importMapPath,
  ];
};

export async function upgradeDeps(
  importMap: ImportMap,
  logs = true,
  deps = PACKAGES_TO_CHECK,
) {
  let upgradeFound = false;
  logs && console.info("Looking up latest versions");

  await Promise.all(
    Object.keys(importMap.imports ?? {})
      .filter((pkg) => deps.test(pkg))
      .map(async (pkg) => {
        const info = await pkgInfo(importMap.imports[pkg], flags["allow-pre"]);

        if (!info?.versions?.latest) return;

        const {
          url,
          versions: { latest: latestVersion, current: currentVersion },
        } = info;

        if (!semver.valid(currentVersion) && !Deno.args.includes("force")) {
          logs && console.log(
            colors.yellow(
              `skipping ${pkg} ${currentVersion} -> ${latestVersion}. Use --force to upgrade.`,
            ),
          );
          return;
        }

        if (currentVersion !== latestVersion) {
          logs && console.info(
            `Upgrading ${pkg} ${currentVersion} -> ${latestVersion}.`,
          );

          upgradeFound = true;
          importMap.imports[pkg] = url.at(latestVersion).url;
        }
      }),
  );

  if (!importMap.imports["deco/"] && importMap.imports["$live/"]) {
    logs && console.info("Add deco/ alias");
    importMap.imports["deco/"] = importMap.imports["$live/"];
  }

  for (const [pkg, minVer] of Object.entries(requiredMinVersion)) {
    if (importMap.imports[pkg]) {
      const url = lookup(importMap.imports[pkg], REGISTRIES);
      const currentVersion = url?.version();
      if (!currentVersion || semver.lt(currentVersion, minVer)) {
        logs && console.info(
          `Upgrading ${pkg} ${currentVersion} -> ${minVer}.`,
        );

        upgradeFound = true;
        importMap.imports[pkg] = url?.at(minVer).url ?? importMap.imports[pkg];
      }
    }
  }

  if (!upgradeFound) {
    logs &&
      console.info(
        "Local website depends on the most recent releases of Live!",
      );
  }
  return upgradeFound;
}

export async function updatedImportMap(logs = true) {
  const [importMap, importMapPath] = await getImportMap(Deno.cwd());
  let upgradeFound = await upgradeDeps(importMap, logs);
  for (const [importKey, importValue] of Object.entries(denoJSON.imports)) {
    if (!(importKey in importMap.imports)) {
      importMap.imports[importKey] = importValue;
      upgradeFound = true;
    }
  }
  if (!upgradeFound) {
    return undefined;
  }
  return [importMap, importMapPath] as [ImportMap, string];
}
export async function update() {
  const updates = await updatedImportMap();
  if (!updates) {
    return;
  }
  const [importMap, importMapPath] = updates;
  await Deno.writeTextFile(importMapPath, stringifyForWrite(importMap));
  console.info("Upgraded successfully");
}
