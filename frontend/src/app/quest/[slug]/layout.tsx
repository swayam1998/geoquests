import type { Metadata } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const apiUrl = apiBase.endsWith("/api/v1") ? apiBase : `${apiBase.replace(/\/$/, "")}/api/v1`;
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoquests.app";

async function getQuestBySlug(slug: string) {
  try {
    const res = await fetch(`${apiUrl}/quests/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const quest = await getQuestBySlug(slug);
  if (!quest) {
    return {
      title: "Quest - GeoQuests",
    };
  }

  const title = `${quest.title} - GeoQuests`;
  const description =
    typeof quest.description === "string" && quest.description.length > 0
      ? quest.description.slice(0, 160)
      : `Location-based photo quest on GeoQuests. Join and complete the challenge!`;

  const ogImageUrl =
    quest.cover_image_url && typeof quest.cover_image_url === "string"
      ? quest.cover_image_url
      : `${siteUrl}/images/hero-bg-web.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/quest/${slug}`,
      siteName: "GeoQuests",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: quest.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function QuestSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
