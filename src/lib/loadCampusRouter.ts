import { CampusRouter, type CampusPathsData } from "./campusRouter";

let router: Promise<CampusRouter> | undefined;

/** Loads the campus walking network (a separate download) the first time directions are needed. */
export function loadCampusRouter(): Promise<CampusRouter> {
  router ??= import("../data/campusPaths.json").then(
    (module) => new CampusRouter(module.default as unknown as CampusPathsData),
  );
  return router;
}
