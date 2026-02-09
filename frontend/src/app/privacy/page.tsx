import Link from "next/link";
import { Header } from "@/components/layout/Header";

export const metadata = {
  title: "Privacy Policy - GeoQuests",
  description: "Privacy policy for GeoQuests. How we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 pb-24 sm:px-6">
        <div className="legal-prose">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: February 10, 2025
          </p>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-foreground/90">
              GeoQuests (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the GeoQuests service at geoquests.io. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our location-based quest platform. By using GeoQuests, you agree to the practices described in this policy.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-foreground/90">
              We collect information that you provide directly, that we obtain when you use our service, and that we receive from third parties.
            </p>
            <ul className="list-disc space-y-2 pl-6 text-foreground/90">
              <li>
                <strong>Account information:</strong> When you sign in with Google or use a magic link, we receive and store your email address. If you use Google OAuth, we may also store your display name and profile picture URL.
              </li>
              <li>
                <strong>Quest and submission content:</strong> Titles, descriptions, and locations of quests you create; photos and metadata you submit to complete quests; and your participation in quests (e.g., joined, completed).
              </li>
              <li>
                <strong>Location data:</strong> Precise or approximate location when you create quests, submit photos, or use map features. We use this to verify submissions and display quests on the map.
              </li>
              <li>
                <strong>Technical and usage data:</strong> Device and browser information, IP address, and how you interact with our service (e.g., pages visited, actions taken) for operation, security, and analytics.
              </li>
            </ul>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="text-foreground/90">
              We use the information we collect to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-foreground/90">
              <li>Provide, maintain, and improve GeoQuests (e.g., showing quests, verifying photo submissions, displaying your profile).</li>
              <li>Authenticate you and manage your account (including OAuth and magic link sign-in).</li>
              <li>Process and review submissions, including using automated systems (e.g., AI) to help verify that photos match quest locations.</li>
              <li>Send you service-related messages (e.g., magic link emails, important updates).</li>
              <li>Protect against abuse, enforce our terms, and comply with legal obligations.</li>
              <li>Analyze usage to improve our product and user experience.</li>
            </ul>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Sharing and Disclosure</h2>
            <p className="text-foreground/90">
              We do not sell your personal information. We may share your information in these limited circumstances:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-foreground/90">
              <li>
                <strong>With other users:</strong> Your display name, avatar, and public quest/submission activity may be visible to other users as part of the service (e.g., on quest pages and leaderboards).
              </li>
              <li>
                <strong>Service providers:</strong> We use third-party services for hosting, authentication (e.g., Google OAuth), email delivery, and AI-based verification. These providers process data on our behalf under contractual obligations.
              </li>
              <li>
                <strong>Legal and safety:</strong> We may disclose information if required by law, to protect our rights or safety, or to prevent fraud or abuse.
              </li>
            </ul>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Data Retention</h2>
            <p className="text-foreground/90">
              We retain your account and content data for as long as your account is active. After you delete your account, we delete or anonymize your personal data within a reasonable period, except where we must retain it for legal, security, or operational reasons.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights and Choices</h2>
            <p className="text-foreground/90">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-foreground/90">
              <li>Access and receive a copy of your personal data.</li>
              <li>Correct or update your data.</li>
              <li>Request deletion of your data and account.</li>
              <li>Object to or restrict certain processing.</li>
              <li>Data portability (receive your data in a structured format).</li>
            </ul>
            <p className="text-foreground/90">
              To exercise these rights, contact us using the details below. You can also delete your account from your account settings. If you are in the EEA or UK, you have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Cookies and Similar Technologies</h2>
            <p className="text-foreground/90">
              We use cookies and similar technologies (e.g., local storage) for authentication, session management, and preferences. You can control cookies through your browser settings; some features may not work if you disable them.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Children</h2>
            <p className="text-foreground/90">
              GeoQuests is not directed at children under 13 (or higher age where required). We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us so we can delete it.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. International Transfers</h2>
            <p className="text-foreground/90">
              Your information may be processed in countries other than your own. We take steps to ensure that such processing is subject to appropriate safeguards (e.g., standard contractual clauses) where required by law.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="text-foreground/90">
              We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot; date. Continued use of GeoQuests after changes constitutes acceptance of the updated policy. For material changes, we may provide additional notice (e.g., email or in-app).
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Contact Us</h2>
            <p className="text-foreground/90">
              For questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <p className="text-foreground/90">
              <strong>GeoQuests</strong><br />
              Email: privacy@geoquests.io
            </p>
          </section>

          <p className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
            <Link href="/" className="text-accent hover:underline">
              ← Back to GeoQuests
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
