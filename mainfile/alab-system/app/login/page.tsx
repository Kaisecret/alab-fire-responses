import { redirect } from "next/navigation";

export default function LoginRedirectRoute() {
  redirect("/resident/login");
}
