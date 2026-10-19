import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * nodemailer must stay out of the server bundle.
   *
   * Next bundles server dependencies by default, and nodemailer resolves parts
   * of itself at runtime (its mime-type tables and service presets are read
   * from disk relative to its own package). Bundled, those reads fail and every
   * send throws — silently, because `notifyAdmin` swallows mail errors so a
   * dead mailer cannot fail a customer's top-up. The symptom was a
   * subscription request returning in ~270ms when a real Gmail send takes
   * ~3.5s, with "[adminNotify] could not send" in the server log.
   */
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
