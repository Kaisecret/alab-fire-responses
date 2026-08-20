import { NotificationCenter } from "@/app/_components/notifications/notification-center";

export default function ProvincialNotificationsPage() {
  return <NotificationCenter apiPath="/api/provincial-bfp/notifications" eyebrow="PROVINCIAL OPERATIONS UPDATES" />;
}
