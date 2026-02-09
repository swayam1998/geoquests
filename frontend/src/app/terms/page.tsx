import Link from "next/link";
import { Header } from "@/components/layout/Header";

export const metadata = {
  title: "Terms of Service - GeoQuests",
  description: "Terms of service for using GeoQuests location-based quest platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 pb-24 sm:px-6">
        <div className="legal-prose">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: February 10, 2025
          </p>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-foreground/90">
              By accessing or using GeoQuests (&quot;Service&quot;) at geoquests.io, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Service. We may update these Terms from time to time; your continued use after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-foreground/90">
              GeoQuests is a platform that lets users create and complete location-based photo quests. You can create quests at specific places, invite others to complete them by submitting photos at the location, and discover quests created by others. The Service may change over time; we do not guarantee that any particular feature will remain available.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Eligibility and Account</h2>
            <p className="text-foreground/90">
              You must be at least 13 years old (or the minimum age in your jurisdiction to consent to these Terms) to use the Service. You are responsible for maintaining the security of your account and for all activity under it. You may sign in via Google OAuth or magic link; you must provide accurate information and keep it up to date.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. User Content and License</h2>
            <p className="text-foreground/90">
              You retain ownership of content you submit (e.g., quest descriptions, photos). By submitting content to GeoQuests, you grant us a worldwide, non-exclusive, royalty-free license to use, store, display, reproduce, and process that content as needed to operate and improve the Service (e.g., showing quests on the map, verifying submissions, displaying your profile). You represent that you have the right to grant this license and that your content does not violate any third-party rights or these Terms.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="text-foreground/90">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-foreground/90">
              <li>Violate any applicable law or encourage illegal activity.</li>
              <li>Harass, abuse, defame, or harm others, or post content that is hateful, obscene, or otherwise objectionable.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation.</li>
              <li>Submit false or misleading location data or photos, or otherwise attempt to circumvent quest verification.</li>
              <li>Interfere with or disrupt the Service, servers, or networks, or attempt to gain unauthorized access to any system or data.</li>
              <li>Scrape, automate, or bulk-download content without our permission.</li>
            </ul>
            <p className="text-foreground/90">
              We may suspend or terminate your account and remove content if we reasonably believe you have violated these Terms or for other operational or legal reasons.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Location Data</h2>
            <p className="text-foreground/90">
              The Service relies on location data for creating quests and verifying submissions. You are responsible for the accuracy of locations you provide and for complying with any laws that apply to collecting or sharing location information. Use of the Service in certain areas may be restricted; you use the Service at your own risk when traveling or in sensitive locations.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Disclaimer of Warranties</h2>
            <p className="text-foreground/90">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. YOU USE THE SERVICE AT YOUR OWN RISK.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
            <p className="text-foreground/90">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, GEOQUESTS AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS ($100) OR THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN SUCH CASES, OUR LIABILITY WILL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Indemnification</h2>
            <p className="text-foreground/90">
              You agree to indemnify, defend, and hold harmless GeoQuests and its affiliates and their officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising out of or related to your use of the Service, your content, or your violation of these Terms or any law.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Termination</h2>
            <p className="text-foreground/90">
              You may stop using the Service at any time. We may suspend or terminate your access to the Service, with or without notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service ceases. Provisions that by their nature should survive (e.g., disclaimers, limitations of liability, indemnification) will survive termination.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Changes to the Service and Terms</h2>
            <p className="text-foreground/90">
              We may modify the Service or these Terms at any time. We will post updated Terms on this page and update the &quot;Last updated&quot; date. Material changes may be communicated via the Service or email where appropriate. Your continued use after changes constitutes acceptance. If you do not agree to the new Terms, you must stop using the Service.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">12. General</h2>
            <p className="text-foreground/90">
              These Terms constitute the entire agreement between you and GeoQuests regarding the Service. If any provision is found unenforceable, the remaining provisions remain in effect. Our failure to enforce any right does not waive that right. You may not assign these Terms without our consent; we may assign them without restriction. These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict of law principles; any disputes shall be resolved in the courts of Delaware. If you are in the European Union, you may also have rights under mandatory consumer laws of your country.
            </p>
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">13. Contact</h2>
            <p className="text-foreground/90">
              For questions about these Terms of Service, contact us at:
            </p>
            <p className="text-foreground/90">
              <strong>GeoQuests</strong><br />
              Email: legal@geoquests.io
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
