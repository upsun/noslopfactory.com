import { describe, expect, it } from 'vitest';
import {
  formatArticleDate,
  newestFirst,
  readingMinutes,
  relatedArticles,
} from './articles';

const article = (id: string, date: string, category = 'Habits') => ({
  id,
  data: { title: id, publishedAt: new Date(date), category },
});

describe('articles', () => {
  it('rounds reading time up and ignores Markdown syntax and code', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('word '.repeat(230))).toBe(1);
    expect(readingMinutes('word '.repeat(231))).toBe(2);
    expect(
      readingMinutes(
        `## Title\n\n[a link](https://example.com) - **bold**\n\n\`\`\`ts\n${'code '.repeat(500)}\n\`\`\``,
      ),
    ).toBe(1);
    expect(readingMinutes('step-by-step '.repeat(230))).toBe(1);
    expect(readingMinutes('- item\n'.repeat(230))).toBe(1);
  });

  it('sorts the newest article first', () => {
    const sorted = newestFirst([
      article('old', '2026-11-01'),
      article('new', '2026-11-20'),
      article('b-same', '2026-11-10'),
      article('a-same', '2026-11-10'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      'new',
      'a-same',
      'b-same',
      'old',
    ]);
  });

  it('prints the calendar date from the frontmatter in every time zone', () => {
    expect(formatArticleDate(new Date('2026-11-24'))).toBe('November 24, 2026');
    expect(formatArticleDate(new Date('2026-11-24'), 'short')).toBe(
      'Nov 24, 2026',
    );
  });

  it('suggests other articles from the same category first', () => {
    const current = article('current', '2026-11-24', 'Verification');
    const related = relatedArticles(current, [
      current,
      article('newest-habit', '2026-11-23'),
      article('old-check', '2026-11-01', 'Verification'),
      article('older-habit', '2026-10-01'),
    ]);
    expect(related.map((item) => item.id)).toEqual([
      'old-check',
      'newest-habit',
      'older-habit',
    ]);
  });
});
