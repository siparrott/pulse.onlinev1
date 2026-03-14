import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — AxixOS',
  description:
    'How AxixOS collects, uses, and protects your data. Read our privacy policy for full transparency.',
}

const LAST_UPDATED = 'March 14, 2026'

const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'who-we-are', label: 'Who we are' },
  { id: 'what-data-we-collect', label: 'What data we collect' },
  { id: 'how-we-collect-data', label: 'How we collect data' },
  { id: 'how-we-use-data', label: 'How we use data' },
  { id: 'legal-bases', label: 'Legal bases for processing' },
  { id: 'cookies', label: 'Cookies and analytics' },
  { id: 'oauth', label: 'OAuth and third-party login' },
  { id: 'social-integrations', label: 'Social media integrations' },
  { id: 'payments', label: 'Payment processors' },
  { id: 'retention', label: 'Data retention' },
  { id: 'sharing', label: 'Data sharing' },
  { id: 'international-transfers', label: 'International transfers' },
  { id: 'user-rights', label: 'User rights' },
  { id: 'data-deletion', label: 'Data deletion requests' },
  { id: 'security', label: 'Security' },
  { id: 'children', label: "Children's privacy" },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact details' },
]

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-xl font-semibold text-zinc-100">{title}</h2>
      <div className="space-y-3 text-zinc-400 leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 sm:px-8">
      <article className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/"
            className="mb-6 inline-block text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Back to AxixOS
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        {/* Table of Contents */}
        <nav className="mb-14 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Contents
          </h2>
          <ol className="columns-1 gap-x-8 space-y-1.5 text-sm sm:columns-2">
            {TOC.map(({ id, label }, i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-emerald-400/80 hover:text-emerald-300 transition-colors"
                >
                  {i + 1}. {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Policy Sections */}
        <div className="space-y-10">
          <Section id="introduction" title="1. Introduction">
            <p>
              This Privacy Policy explains how AxixOS (&quot;we&quot;,
              &quot;us&quot;, &quot;our&quot;) collects, uses, stores, and
              protects information when you use our platform at{' '}
              <a
                href="https://axixos.com"
                className="text-emerald-400 hover:underline"
              >
                axixos.com
              </a>{' '}
              and related services. We are committed to transparency and to
              handling your data responsibly.
            </p>
            <p>
              By accessing or using AxixOS, you acknowledge that you have read
              and understood this policy. If you do not agree with our
              practices, please do not use the platform.
            </p>
            <p className="text-sm text-zinc-500 italic">
              This document is provided for transparency and does not
              constitute legal advice.
            </p>
          </Section>

          <Section id="who-we-are" title="2. Who we are">
            <p>
              AxixOS is a governed content-publishing platform that helps teams
              manage multi-channel social media publishing with built-in
              governance, scheduling, and analytics. The platform is operated
              under the AxixOS brand.
            </p>
            <p>
              If you have any privacy-related questions, you can reach us at{' '}
              <a
                href="mailto:hello@axixos.com"
                className="text-emerald-400 hover:underline"
              >
                hello@axixos.com
              </a>
              .
            </p>
          </Section>

          <Section id="what-data-we-collect" title="3. What data we collect">
            <p>We may collect the following types of information:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-zinc-300">Account information:</strong>{' '}
                name, email address, and profile image as provided by your login
                provider.
              </li>
              <li>
                <strong className="text-zinc-300">Authentication data:</strong>{' '}
                OAuth tokens and session identifiers required to keep you signed
                in.
              </li>
              <li>
                <strong className="text-zinc-300">
                  Connected social accounts:
                </strong>{' '}
                access tokens and profile metadata for social media accounts you
                choose to connect.
              </li>
              <li>
                <strong className="text-zinc-300">Content data:</strong> posts,
                images, schedules, and publishing metadata you create within the
                platform.
              </li>
              <li>
                <strong className="text-zinc-300">Usage data:</strong> pages
                visited, features used, timestamps, and general interaction
                patterns.
              </li>
              <li>
                <strong className="text-zinc-300">Device information:</strong>{' '}
                browser type, operating system, IP address, and screen
                resolution.
              </li>
            </ul>
          </Section>

          <Section id="how-we-collect-data" title="4. How we collect data">
            <p>We collect information through:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Information you provide directly when signing up, connecting
                accounts, or creating content.
              </li>
              <li>
                Automated means such as cookies, session tokens, and server
                logs.
              </li>
              <li>
                Third-party OAuth providers (e.g. Google, GitHub, Facebook,
                LinkedIn, TikTok) when you choose to sign in or connect an
                account. These providers may share your name, email address, and
                profile image depending on the permissions you grant.
              </li>
            </ul>
          </Section>

          <Section id="how-we-use-data" title="5. How we use data">
            <p>
              Your data is only processed to provide the platform and the
              services you have requested. Specifically, we use your information
              to:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Authenticate your identity and maintain your session.</li>
              <li>
                Provide core platform features including content creation,
                scheduling, publishing, and analytics.
              </li>
              <li>
                Connect to third-party social media platforms on your behalf.
              </li>
              <li>
                Enforce governance rules and content-safety checks before
                publishing.
              </li>
              <li>Improve platform reliability, performance, and security.</li>
              <li>
                Communicate with you about your account or service-related
                matters.
              </li>
            </ul>
          </Section>

          <Section id="legal-bases" title="6. Legal bases for processing">
            <p>
              Depending on your jurisdiction, we rely on one or more of the
              following legal bases:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-zinc-300">Contractual necessity:</strong>{' '}
                processing required to provide you with the services you
                requested.
              </li>
              <li>
                <strong className="text-zinc-300">Consent:</strong> where you
                explicitly agree, for example when connecting a social media
                account or accepting cookies.
              </li>
              <li>
                <strong className="text-zinc-300">Legitimate interests:</strong>{' '}
                improving our platform, preventing fraud, and ensuring security,
                provided these interests do not override your rights.
              </li>
              <li>
                <strong className="text-zinc-300">Legal obligation:</strong>{' '}
                where we are required to process data to comply with applicable
                law.
              </li>
            </ul>
          </Section>

          <Section id="cookies" title="7. Cookies and analytics">
            <p>
              AxixOS uses cookies and similar technologies to maintain your
              authenticated session, remember your preferences, and understand
              how the platform is used.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-zinc-300">Session cookies:</strong>{' '}
                essential for keeping you signed in. These expire when your
                session ends or after a period of inactivity.
              </li>
              <li>
                <strong className="text-zinc-300">Preference cookies:</strong>{' '}
                store settings such as your selected channel or theme.
              </li>
              <li>
                <strong className="text-zinc-300">Analytics:</strong> we may use
                privacy-respecting analytics tools to understand usage patterns.
                No data is sold to advertisers.
              </li>
            </ul>
            <p>
              You can manage cookie preferences through your browser settings.
              Disabling essential cookies may prevent the platform from
              functioning correctly.
            </p>
          </Section>

          <Section
            id="oauth"
            title="8. OAuth and third-party login providers"
          >
            <p>
              AxixOS allows you to sign in using third-party providers such as
              Google, GitHub, Facebook, LinkedIn, TikTok, or similar services.
              When you sign in through an OAuth provider, that provider may share
              information with us including your name, email address, and profile
              image, depending on the permissions you grant during the sign-in
              process.
            </p>
            <p>
              We only request the minimum permissions needed to authenticate you
              and deliver the service. We do not access your contacts, files, or
              other unrelated data from these providers unless you explicitly
              authorise it.
            </p>
            <p>
              Each OAuth provider has its own privacy policy. We encourage you to
              review the privacy practices of any provider you use to sign in.
            </p>
          </Section>

          <Section
            id="social-integrations"
            title="9. Social media integrations"
          >
            <p>
              AxixOS may allow you to connect social media accounts for the
              purpose of publishing, analytics, scheduling, or automation. When
              you connect an account, we store the access tokens and basic
              profile information necessary to perform actions on your behalf.
            </p>
            <p>
              You can disconnect a social media account at any time from your
              account settings. When disconnected, we revoke or delete the
              associated access tokens.
            </p>
            <p>
              Third-party social media platforms operate under their own privacy
              policies and terms of service. AxixOS is not responsible for the
              data-handling practices of these platforms.
            </p>
          </Section>

          <Section id="payments" title="10. Payment processors">
            <p>
              If AxixOS offers paid features, payment processing is handled by
              third-party payment providers (which may include services such as
              Stripe). We do not store your full credit card number, CVV, or
              bank account details on our servers. Payment providers process your
              data in accordance with their own privacy policies and PCI-DSS
              standards.
            </p>
          </Section>

          <Section id="retention" title="11. Data retention">
            <p>
              We retain your data for as long as your account is active or as
              needed to provide you with our services. If you delete your
              account, we will remove your personal data within a reasonable
              timeframe, except where retention is required by law or for
              legitimate business purposes such as fraud prevention.
            </p>
            <p>
              Aggregated, anonymised data that cannot identify you may be
              retained indefinitely for analytics and service improvement.
            </p>
          </Section>

          <Section id="sharing" title="12. Data sharing">
            <p>
              We do not sell your personal data. We may share data only in the
              following circumstances:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-zinc-300">Service providers:</strong>{' '}
                trusted third-party services that help us operate the platform
                (e.g. hosting, database, analytics). These providers are
                contractually obligated to protect your data.
              </li>
              <li>
                <strong className="text-zinc-300">Social platforms:</strong>{' '}
                when you explicitly instruct us to publish or retrieve data from
                a connected social account.
              </li>
              <li>
                <strong className="text-zinc-300">Legal requirements:</strong>{' '}
                if required by law, regulation, legal process, or governmental
                request.
              </li>
              <li>
                <strong className="text-zinc-300">
                  Business transfers:
                </strong>{' '}
                in connection with a merger, acquisition, or sale of assets,
                with appropriate notice.
              </li>
            </ul>
          </Section>

          <Section
            id="international-transfers"
            title="13. International transfers"
          >
            <p>
              Your data may be processed in countries other than your own. Our
              infrastructure providers may store data in multiple regions. Where
              transfers occur, we take reasonable steps to ensure your data
              remains protected in accordance with this policy and applicable
              data-protection laws.
            </p>
          </Section>

          <Section id="user-rights" title="14. User rights">
            <p>
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate or incomplete data.</li>
              <li>Request deletion of your data.</li>
              <li>Object to or restrict certain processing.</li>
              <li>Request a portable copy of your data.</li>
              <li>Withdraw consent at any time where processing is based on consent.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{' '}
              <a
                href="mailto:hello@axixos.com"
                className="text-emerald-400 hover:underline"
              >
                hello@axixos.com
              </a>
              . We will respond within a reasonable timeframe and in accordance
              with applicable law.
            </p>
          </Section>

          <Section id="data-deletion" title="15. Data deletion requests">
            <p>
              You may request deletion of your account and all associated data
              at any time by emailing{' '}
              <a
                href="mailto:hello@axixos.com"
                className="text-emerald-400 hover:underline"
              >
                hello@axixos.com
              </a>{' '}
              with the subject line &quot;Data Deletion Request&quot;.
            </p>
            <p>
              Upon receiving your request, we will verify your identity and
              delete your personal data, connected account tokens, and content
              within a reasonable timeframe. Some data may be retained where
              required by law.
            </p>
            <p>
              If you signed in using a third-party provider such as Facebook or
              Google, you may also contact us to request deletion of any
              account-related data we received through that provider.
            </p>
          </Section>

          <Section id="security" title="16. Security">
            <p>
              We implement appropriate technical and organisational measures to
              protect your data against unauthorised access, alteration,
              disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Encryption in transit (TLS/HTTPS) and at rest where applicable.</li>
              <li>Secure authentication via OAuth 2.0 with no plain-text password storage.</li>
              <li>Access controls limiting data access to authorised personnel and systems.</li>
              <li>Security monitoring and logging for fraud prevention and incident response.</li>
            </ul>
            <p>
              No system is completely secure. While we take reasonable
              precautions, we cannot guarantee absolute security of your data.
            </p>
          </Section>

          <Section id="children" title="17. Children's privacy">
            <p>
              AxixOS is not directed at children under the age of 16. We do not
              knowingly collect personal data from children. If you believe a
              child has provided us with personal data, please contact us at{' '}
              <a
                href="mailto:hello@axixos.com"
                className="text-emerald-400 hover:underline"
              >
                hello@axixos.com
              </a>{' '}
              and we will promptly delete the information.
            </p>
          </Section>

          <Section id="changes" title="18. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices or for legal, operational, or regulatory
              reasons. When we make material changes, we will update the
              &quot;Last updated&quot; date at the top of this page.
            </p>
            <p>
              We encourage you to review this policy periodically. Continued use
              of the platform after changes constitutes acceptance of the
              revised policy.
            </p>
          </Section>

          <Section id="contact" title="19. Contact details">
            <p>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or how we handle your data, please contact us:
            </p>
            <p>
              <strong className="text-zinc-300">Email:</strong>{' '}
              <a
                href="mailto:hello@axixos.com"
                className="text-emerald-400 hover:underline"
              >
                hello@axixos.com
              </a>
            </p>
            <p>
              We aim to respond to all enquiries within 30 days.
            </p>
          </Section>
        </div>

        {/* Footer Links */}
        <footer className="mt-16 border-t border-zinc-800 pt-8">
          <div className="flex flex-wrap gap-6 text-sm text-zinc-500">
            <Link
              href="/terms"
              className="text-emerald-400/80 hover:text-emerald-300 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="text-emerald-400/80 hover:text-emerald-300 transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/"
              className="text-emerald-400/80 hover:text-emerald-300 transition-colors"
            >
              Home
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            © {new Date().getFullYear()} AxixOS. All rights reserved.
          </p>
        </footer>
      </article>
    </main>
  )
}
