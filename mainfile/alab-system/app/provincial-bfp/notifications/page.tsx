import { NotificationCenter } from "@/app/_components/notifications/notification-center";
import { FireCommandHeader } from "@/app/_components/fire-command-header";

export default function ProvincialNotificationsPage() {
  return <>
    <FireCommandHeader slotId="provincial-fire-command-header" title="Notifications" icon="fa-bell" />
    <NotificationCenter apiPath="/api/provincial-bfp/notifications" showHeading={false} />
  </>;
}
