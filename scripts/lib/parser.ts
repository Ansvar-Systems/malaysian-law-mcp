/**
 * HTML parser for Malaysian legislation from CommonLII (commonlii.org/my/legis/).
 *
 * CommonLII serves consolidated Malaysian statutes as plain HTML pages with
 * a flat structure. The legislation text uses minimal HTML elements — mostly
 * <p> tags and raw text. No semantic CSS classes.
 *
 * Malaysian statutes follow the common law tradition with "Section" numbering
 * (s1, s2, ...). The Federal Constitution uses "Article" numbering.
 *
 * CommonLII HTML structure:
 *   - First half: "ARRANGEMENT OF SECTIONS" (table of contents)
 *   - Second half: actual provision text (after "BE IT ENACTED..." or similar)
 *   - Section boundaries: <p>N. (1) ... or <p>N. Title text...
 *   - Part/Chapter headings: PART I, PART II, Chapter 1, etc.
 *   - Page number artifacts: "7Abattoirs (Privatization)" at page breaks
 */

export interface ActIndexEntry {
  id: string;
  slug: string;
  title: string;
  titleClean: string;
  actNumber: string;
  year: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  url: string;
  /** Whether this act uses "Article" instead of "Section" (e.g. Federal Constitution) */
  usesArticles?: boolean;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  title_en: string;
  short_name: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issued_date: string;
  in_force_date: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

/**
 * Strip HTML tags and decode common entities, normalising whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#xA0;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/\u200B/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

/**
 * Remove CommonLII page-break artifacts.
 * These appear as: "7Abattoirs (Privatization)" or "12 Laws of Malaysia ACT 507"
 */
function removePageBreaks(text: string): string {
  return text
    .replace(/\n?\d+\s*(?:Laws of Malaysia|LAWS OF MALAYSIA)\s+(?:ACT|Act)\s+\d+/g, '')
    .replace(/\n?\d+[A-Z][a-z].*?(?:Act|Ordinance|Code|Constitution)/g, (match) => {
      // Only remove if it looks like a page break (starts with digits followed by title text)
      if (/^\n?\d+[A-Z]/.test(match)) return '';
      return match;
    })
    .trim();
}

/**
 * Find the start of actual provision text (after the "Arrangement of Sections"
 * table of contents). CommonLII pages typically have:
 *   1. Front matter (title, reprint info)
 *   2. Arrangement of Sections (table of contents)
 *   3. Enactment clause ("BE IT ENACTED...")
 *   4. Actual provision text
 *
 * We want to start parsing from #3 or #4.
 */
function findProvisionStart(html: string): number {
  // Look for the enactment clause
  const enactPatterns = [
    /BE IT ENACTED/i,
    /IT IS HEREBY ENACTED/i,
    /the same,\s*as follows/i,
    /in Parliament assembled/i,
  ];

  for (const pattern of enactPatterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      // Find the next <p> after the enactment clause
      const afterEnact = html.indexOf('<p>', match.index + match[0].length);
      if (afterEnact !== -1) return afterEnact;
      return match.index + match[0].length;
    }
  }

  // Fallback: look for the second occurrence of PART I (first is in arrangement, second in text)
  const parts = [...html.matchAll(/PART\s+I\b/gi)];
  if (parts.length >= 2 && parts[1].index !== undefined) {
    return parts[1].index;
  }

  // Last resort: start from 40% through the document (skip arrangement)
  return Math.floor(html.length * 0.4);
}

/**
 * Parse CommonLII HTML to extract provisions from a Malaysian statute page.
 *
 * Strategy:
 * 1. Find where actual provisions start (skip arrangement of sections)
 * 2. Split text on section boundaries (pattern: <p>N. or N. at start of line)
 * 3. Track Part/Chapter headings for context
 * 4. Extract definitions from "interpretation" sections
 */
export function parseMalaysianHtml(html: string, act: ActIndexEntry): ParsedAct {
  const provisions: ParsedProvision[] = [];
  const definitions: ParsedDefinition[] = [];

  // Determine provision prefix based on act type
  const prefix = act.usesArticles ? 'art' : 's';

  // Get the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const fullBody = bodyMatch ? bodyMatch[1] : html;

  // Find where actual provision text starts
  const provStart = findProvisionStart(fullBody);
  const bodyHtml = fullBody.substring(provStart);

  // Convert to text for easier processing, preserving structure markers
  // First, mark section boundaries in a way we can split on
  let processedHtml = bodyHtml;

  // Track current chapter/part
  let currentChapter = '';

  // Split into lines/blocks at <p> boundaries
  const blocks = processedHtml
    .split(/<p\s*[^>]*>/gi)
    .map(b => b.replace(/<\/p>/gi, '').trim())
    .filter(b => b.length > 0);

  // State machine: accumulate text for current section
  let currentSectionNum = '';
  let currentSectionTitle = '';
  let currentSectionContent: string[] = [];

  function flushSection(): void {
    if (!currentSectionNum) return;

    const contentText = removePageBreaks(
      stripHtml(currentSectionContent.join('\n'))
    ).trim();

    if (contentText.length > 15) {
      const provRef = `${prefix}${currentSectionNum}`;

      provisions.push({
        provision_ref: provRef,
        chapter: currentChapter || undefined,
        section: currentSectionNum,
        title: currentSectionTitle,
        content: contentText.substring(0, 12000),
      });

      // Extract definitions from "interpretation" sections
      if (/interpret|definition|meaning/i.test(currentSectionTitle) || currentSectionNum === '2' || currentSectionNum === '3') {
        extractDefinitions(contentText, provRef, definitions);
      }
    }
  }

  // Section number pattern: "N." or "N. (1)" at the start of a block
  // Must handle: "1.", "1. (1)", "23A.", "123.", etc.
  const sectionStartRe = /^(\d+[A-Za-z]?)\.\s*(.*)/s;

  // Part/Chapter heading pattern
  const partChapterRe = /^(PART|Part|CHAPTER|Chapter|BAHAGIAN|DIVISION)\s+([IVXLCDM0-9]+[A-Za-z]?(?:\s*[-\u2013]\s*[^\n<]*)?)/i;

  // Title line pattern (appears before section number — usually the section title in Title Case)
  let pendingTitle = '';

  for (const block of blocks) {
    const cleanBlock = stripHtml(block).trim();
    if (!cleanBlock) continue;

    // Check for Part/Chapter heading
    const partMatch = cleanBlock.match(partChapterRe);
    if (partMatch) {
      // Full chapter: "PART I" or "PART I - PRELIMINARY"
      const fullHeading = cleanBlock.replace(/\n.*/s, '').trim();
      // Look for a subtitle on the next line
      const lines = cleanBlock.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length > 1 && !sectionStartRe.test(lines[1])) {
        currentChapter = `${lines[0]} - ${lines[1]}`.substring(0, 200);
      } else {
        currentChapter = fullHeading.substring(0, 200);
      }
      continue;
    }

    // Check for section start
    const secMatch = cleanBlock.match(sectionStartRe);
    if (secMatch) {
      // Flush previous section
      flushSection();

      currentSectionNum = secMatch[1];
      currentSectionTitle = pendingTitle || '';
      currentSectionContent = [cleanBlock];
      pendingTitle = '';
      continue;
    }

    // Check if this is a standalone title line (Title Case, no period, short)
    // before the next section number
    if (
      cleanBlock.length < 200 &&
      !cleanBlock.includes('.') &&
      /^[A-Z]/.test(cleanBlock) &&
      !/^\d/.test(cleanBlock) &&
      !/^(PART|CHAPTER|BAHAGIAN|DIVISION|SCHEDULE|LAWS OF|ARRANGEMENT)/i.test(cleanBlock)
    ) {
      pendingTitle = cleanBlock.replace(/\n.*$/s, '').trim();
      // Still add to content if we have an active section
      if (currentSectionNum) {
        currentSectionContent.push(cleanBlock);
      }
      continue;
    }

    // Skip page-break artifacts
    if (/^\d+\s*(?:Laws of Malaysia|LAWS OF MALAYSIA)/i.test(cleanBlock)) {
      continue;
    }
    if (/^\d+[A-Z][a-z]/.test(cleanBlock) && cleanBlock.length < 60) {
      continue;
    }

    // Accumulate content for current section
    if (currentSectionNum) {
      currentSectionContent.push(cleanBlock);
    }

    pendingTitle = '';
  }

  // Flush the last section
  flushSection();

  // Deduplicate provisions by provision_ref (keep longest content)
  const byRef = new Map<string, ParsedProvision>();
  for (const prov of provisions) {
    const existing = byRef.get(prov.provision_ref);
    if (!existing || prov.content.length > existing.content.length) {
      byRef.set(prov.provision_ref, prov);
    }
  }

  // Deduplicate definitions by term (keep longest)
  const byTerm = new Map<string, ParsedDefinition>();
  for (const def of definitions) {
    const existing = byTerm.get(def.term.toLowerCase());
    if (!existing || def.definition.length > existing.definition.length) {
      byTerm.set(def.term.toLowerCase(), def);
    }
  }

  return {
    id: act.id,
    type: 'statute',
    title: act.titleClean || act.title,
    title_en: act.titleClean || act.title,
    short_name: act.titleClean || act.title,
    status: act.status,
    issued_date: act.year || '',
    in_force_date: act.year || '',
    url: act.url,
    provisions: Array.from(byRef.values()),
    definitions: Array.from(byTerm.values()),
  };
}

/**
 * Extract definitions from a provision's text.
 * Malaysian statutes use patterns like:
 *   "term" means ...;
 *   "term" includes ...;
 */
function extractDefinitions(
  text: string,
  sourceProvision: string,
  definitions: ParsedDefinition[],
): void {
  // Pattern: "term" means/includes ... ending with ; or .
  const defPattern = /["\u201C]([^"\u201D]{2,80})["\u201D]\s+(?:means|includes|has the meaning)\s+([\s\S]*?)(?=;\s*$|;\s*["\u201C]|;\s*\n|$)/gm;
  let defMatch: RegExpExecArray | null;

  while ((defMatch = defPattern.exec(text)) !== null) {
    const term = defMatch[1].trim();
    const defBody = defMatch[2].trim();

    if (term.length > 1 && term.length < 100 && defBody.length > 5) {
      definitions.push({
        term,
        definition: `"${term}" means ${defBody}`.substring(0, 4000),
        source_provision: sourceProvision,
      });
    }
  }

  // Also try the unquoted pattern: term—means/includes
  const defPattern2 = /\b([A-Z][a-z]+(?:\s+[a-z]+)*)\s*[-\u2014]+\s*means\s+([\s\S]*?)(?=;\s*$|;\s*\n|$)/gm;
  while ((defMatch = defPattern2.exec(text)) !== null) {
    const term = defMatch[1].trim();
    const defBody = defMatch[2].trim();

    if (term.length > 2 && term.length < 80 && defBody.length > 5) {
      definitions.push({
        term,
        definition: `"${term}" means ${defBody}`.substring(0, 4000),
        source_provision: sourceProvision,
      });
    }
  }
}

/**
 * Pre-configured list of key Malaysian Acts (fallback when no census.json exists).
 * The census script generates the authoritative full list.
 */
export const KEY_MALAYSIAN_ACTS: ActIndexEntry[] = [
  {
    id: 'pdpa2010360',
    slug: 'pdpa2010360',
    title: 'Personal Data Protection Act 2010',
    titleClean: 'Personal Data Protection Act 2010',
    actNumber: 'Act 709',
    year: '2010',
    status: 'in_force',
    url: 'http://www.commonlii.org/my/legis/consol_act/pdpa2010360',
    usesArticles: false,
  },
  {
    id: 'cca1997210',
    slug: 'cca1997210',
    title: 'Computer Crimes Act 1997',
    titleClean: 'Computer Crimes Act 1997',
    actNumber: 'Act 563',
    year: '1997',
    status: 'in_force',
    url: 'http://www.commonlii.org/my/legis/consol_act/cca1997210',
    usesArticles: false,
  },
  {
    id: 'cama1998289',
    slug: 'cama1998289',
    title: 'Communications and Multimedia Act 1998',
    titleClean: 'Communications and Multimedia Act 1998',
    actNumber: 'Act 588',
    year: '1998',
    status: 'in_force',
    url: 'http://www.commonlii.org/my/legis/consol_act/cama1998289',
    usesArticles: false,
  },
  {
    id: 'ca2016139',
    slug: 'ca2016139',
    title: 'Companies Act 2016',
    titleClean: 'Companies Act 2016',
    actNumber: 'Act 777',
    year: '2016',
    status: 'in_force',
    url: 'http://www.commonlii.org/my/legis/consol_act/ca2016139',
    usesArticles: false,
  },
  {
    id: 'eca2006203',
    slug: 'eca2006203',
    title: 'Electronic Commerce Act 2006',
    titleClean: 'Electronic Commerce Act 2006',
    actNumber: 'Act 658',
    year: '2006',
    status: 'in_force',
    url: 'http://www.commonlii.org/my/legis/consol_act/eca2006203',
    usesArticles: false,
  },
];
