// What the landing page's "How to use" dialog shows a resident.
//
// To add the how-to video: put the file at public/videos/how-to-use.mp4 and
// set HOW_TO_USE_VIDEO_SRC to "/videos/how-to-use.mp4". Until then the dialog
// shows a "Video coming soon" placeholder in the video frame.
export const HOW_TO_USE_VIDEO_SRC = "";

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
