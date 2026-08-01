import { userModules } from "../_content/user-modules";
import { ModuleShell } from "./module-shell";

export function ProvincialBfpModule() {
  return (
    <ModuleShell
      accent="provincial"
      moduleData={userModules["provincial-bfp"]}
    />
  );
}
