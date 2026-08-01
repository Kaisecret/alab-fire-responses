import { userModules } from "../_content/user-modules";
import { ModuleShell } from "./module-shell";

export function MunicipalBfpModule() {
  return (
    <ModuleShell
      accent="municipal"
      moduleData={userModules["municipal-bfp"]}
    />
  );
}
