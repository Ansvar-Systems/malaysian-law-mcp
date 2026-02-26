#!/usr/bin/env tsx
/**
 * Malaysian Law MCP — Census Script
 *
 * Enumerates ALL consolidated Malaysian federal Acts from CommonLII
 * (commonlii.org/my/legis/consol_act/) by scraping the alphabetical
 * table-of-contents pages (toc-A.html through toc-Y.html).
 *
 * Writes data/census.json in golden standard format.
 *
 * Usage:
 *   npx tsx scripts/census.ts
 *
 * The index pages list acts as:
 *   <li class="make-database"><a href="{slug}">Act Title</a></li>
 *
 * Some titles contain "(Repealed by Act NNN)" suffixes which we flag
 * as classification: 'metadata_only'.
 *
 * Data sourced from CommonLII — open access to Malaysian government legislation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRateLimit } from './lib/fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const CENSUS_PATH = path.join(DATA_DIR, 'census.json');

const BASE_URL = 'http://www.commonlii.org/my/legis/consol_act/';

// All letters that have toc pages (X and Z have no acts on CommonLII)
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWY'.split('');

interface CensusAct {
  id: string;
  slug: string;
  title: string;
  titleClean: string;
  actNumber: string;
  year: string;
  url: string;
  classification: 'ingestable' | 'inaccessible' | 'metadata_only';
  repealed: boolean;
  repealedBy: string;
}

interface CensusOutput {
  generated_at: string;
  source: string;
  description: string;
  stats: {
    total: number;
    class_ingestable: number;
    class_inaccessible: number;
    class_metadata_only: number;
  };
  ingestion?: {
    completed_at: string;
    total_laws: number;
    total_provisions: number;
    coverage_pct: string;
  };
  laws: CensusAct[];
}

/**
 * Generate a kebab-case ID from the CommonLII slug.
 * e.g. "aa1993284" -> "aa1993284"
 */
function slugToId(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract the Act number from the title if present.
 * Pattern: "Act NNN" in the title text or slug.
 */
function extractActNumber(title: string): string {
  const match = title.match(/\bAct\s+(\d+)\b/i);
  return match ? `Act ${match[1]}` : '';
}

/**
 * Extract the year from the title.
 * Pattern: 4-digit year, typically at the end.
 */
function extractYear(title: string): string {
  // Look for year patterns like "1993", "2006", etc.
  const matches = title.match(/\b(1[89]\d{2}|20[0-2]\d)\b/g);
  return matches ? matches[0] : '';
}

/**
 * Clean the title by removing "(Repealed by Act NNN)" suffixes and extra whitespace.
 */
function cleanTitle(title: string): { clean: string; repealed: boolean; repealedBy: string } {
  const repealMatch = title.match(/\s*\(\s*Repealed\s+by\s+Act\s+(\d+)\s*\)\s*$/i);
  if (repealMatch) {
    return {
      clean: title.replace(repealMatch[0], '').trim(),
      repealed: true,
      repealedBy: `Act ${repealMatch[1]}`,
    };
  }
  return { clean: title.trim(), repealed: false, repealedBy: '' };
}

/**
 * Parse a single alphabetical toc page and extract all Act entries.
 */
function parseTocPage(html: string): CensusAct[] {
  const acts: CensusAct[] = [];

  // Match: <li class="make-database"><a href="{slug}" ...>{title}</a></li>
  const liRe = /<li\s+class="make-database">\s*<a\s+href="([^"]+)"\s*[^>]*>\s*([\s\S]*?)\s*<\/a>\s*<\/li>/gi;
  let match: RegExpExecArray | null;

  while ((match = liRe.exec(html)) !== null) {
    const slug = match[1].replace(/\/$/, '').trim();
    const rawTitle = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (!slug || !rawTitle) continue;

    const { clean, repealed, repealedBy } = cleanTitle(rawTitle);
    const id = slugToId(slug);
    const url = `${BASE_URL}${slug}`;

    acts.push({
      id,
      slug,
      title: rawTitle,
      titleClean: clean,
      actNumber: extractActNumber(rawTitle),
      year: extractYear(rawTitle),
      url,
      classification: repealed ? 'metadata_only' : 'ingestable',
      repealed,
      repealedBy,
    });
  }

  return acts;
}

async function main(): Promise<void> {
  console.log('Malaysian Law MCP — Census');
  console.log('==========================\n');
  console.log('  Source:  CommonLII (commonlii.org/my/legis/consol_act/)');
  console.log('  Method:  Alphabetical toc page scrape (toc-A.html–toc-Y.html)');
  console.log('  License: Open Access (Malaysian government legislation)\n');

  const allActs: CensusAct[] = [];
  const seen = new Set<string>();

  for (const letter of LETTERS) {
    const url = `${BASE_URL}toc-${letter}.html`;
    process.stdout.write(`  Fetching toc-${letter}.html...`);

    try {
      const result = await fetchWithRateLimit(url);

      if (result.status !== 200) {
        console.log(` HTTP ${result.status} — skipped`);
        continue;
      }

      const acts = parseTocPage(result.body);

      let added = 0;
      for (const act of acts) {
        if (!seen.has(act.slug)) {
          seen.add(act.slug);
          allActs.push(act);
          added++;
        }
      }

      console.log(` ${acts.length} acts found (${added} new)`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(` ERROR: ${msg}`);
    }
  }

  // Sort alphabetically by title for deterministic output
  allActs.sort((a, b) => a.titleClean.localeCompare(b.titleClean));

  const ingestable = allActs.filter(a => a.classification === 'ingestable');
  const metadataOnly = allActs.filter(a => a.classification === 'metadata_only');

  // Build census output
  const census: CensusOutput = {
    generated_at: new Date().toISOString(),
    source: 'commonlii.org/my/legis/consol_act/ (CommonLII alphabetical toc pages)',
    description: 'Full census of Malaysian consolidated federal legislation from CommonLII',
    stats: {
      total: allActs.length,
      class_ingestable: ingestable.length,
      class_inaccessible: 0,
      class_metadata_only: metadataOnly.length,
    },
    laws: allActs,
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2) + '\n');

  console.log(`\n${'='.repeat(50)}`);
  console.log('CENSUS COMPLETE');
  console.log('='.repeat(50));
  console.log(`  Total Acts discovered: ${allActs.length}`);
  console.log(`  Ingestable:            ${ingestable.length}`);
  console.log(`  Metadata only:         ${metadataOnly.length} (repealed acts)`);
  console.log(`\n  Output: ${CENSUS_PATH}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
