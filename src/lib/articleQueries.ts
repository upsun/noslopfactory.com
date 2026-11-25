import { getCollection } from 'astro:content';
import { newestFirst } from './articles';

/** Published articles, newest first. The dev server also shows drafts. */
export async function getArticles() {
  const articles = await getCollection(
    'articles',
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return newestFirst(articles);
}
