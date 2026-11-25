// What the landing page's "How to use" dialog shows a resident.
//
// The tutorial video is on YouTube ("ALAB tutorial"). To swap it, change the
// id: it is the part after youtu.be/ in the share link.
export const HOW_TO_USE_YOUTUBE_ID = "2CF_jjupUbU";

export const HOW_TO_USE_STEPS = [
  {
    title: "Create your resident account",
    detail: "Tap Create account. Enter your name, address, and phone, upload both sides of a valid ID, take a selfie, and confirm the code sent to your phone.",
  },
  {
    title: "Wait for Municipal BFP approval",
    detail: "Your Municipal BFP checks your ID and selfie. You are told when your account is approved, or what to correct.",
  },
  {
    title: "Log in to the resident app",
    detail: "Log in with your username or email and password. You can choose English, Tagalog, or Hiligaynon.",
  },
  {
    title: "Report a fire and follow its status",
    detail: "Move to a safe place, tap Report Fire, check your location, choose what is burning, add a photo, and send. Follow each update until the fire is resolved.",
  },
] as const;
