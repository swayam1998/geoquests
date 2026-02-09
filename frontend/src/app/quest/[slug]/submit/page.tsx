"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Submit quest is now part of the quest detail page.
 * This route redirects to the quest page and scrolls to the submit section.
 */
export default function QuestSubmitRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    router.replace(`/quest/${slug}#submit`);
  }, [router, slug]);

  return null;
}
