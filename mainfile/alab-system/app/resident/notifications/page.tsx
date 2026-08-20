import { NotificationCenter } from "@/app/_components/notifications/notification-center";

export default function ResidentNotificationsPage() {
  return <NotificationCenter apiPath="/api/resident/notifications" eyebrow="YOUR EMERGENCY UPDATES" />;
}
