import { NotificationCenter } from "@/app/_components/notifications/notification-center";

export default function MunicipalNotificationsPage() {
  return (
    <NotificationCenter
      apiPath="/api/municipal-bfp/notifications"
      eyebrow="MUNICIPAL COMMAND UPDATES"
      desktopVariant="municipal"
    />
  );
}
