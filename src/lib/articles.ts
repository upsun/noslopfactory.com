export const articleCategories = [
  'Habits',
  'Verification',
  'Perspective',
] as const;
export type ArticleCategory = (typeof articleCategories)[number];

export const articleAccents = ['cyan', 'blue', 'violet', 'warm'] as const;
export type ArticleAccent = (typeof articleAccents)[number];

/** A silent reader covers about 230 words per minute. */
const WORDS_PER_MINUTE = 230;

/** Counts the words of a Markdown body and rounds up to whole minutes, with one minute at least. */
export function readingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|]/g, ' ')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** The newest article comes first. Equal dates keep the title order. */
export function newestFirst<
  T extends { data: { publishedAt: Date; title: string } },
>(articles: ReadonlyArray<T>): T[] {
  return [...articles].sort(
    (a, b) =>
      b.data.publishedAt.getTime() - a.data.publishedAt.getTime() ||
      a.data.title.localeCompare(b.data.title),
  );
}

/** Dates are calendar days, so they print in UTC to match the frontmatter. */
export function formatArticleDate(
  date: Date,
  style: 'long' | 'short' = 'long',
) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Up to `count` other articles: the same category first, then the newest. */
export function relatedArticles<
  T extends {
    id: string;
    data: { publishedAt: Date; title: string; category: string };
  },
>(current: T, articles: ReadonlyArray<T>, count = 3): T[] {
  const others = newestFirst(articles.filter((item) => item.id !== current.id));
  return [
    ...others.filter((item) => item.data.category === current.data.category),
    ...others.filter((item) => item.data.category !== current.data.category),
  ].slice(0, count);
}
