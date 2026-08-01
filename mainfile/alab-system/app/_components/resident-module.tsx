import { userModules } from "../_content/user-modules";
import { ModuleShell } from "./module-shell";

export function ResidentModule() {
  return <ModuleShell accent="resident" moduleData={userModules.resident} />;
}
