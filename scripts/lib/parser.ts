/**
 * HTML parser for Malaysian legislation from CommonLII (commonlii.org/my/legis/).
 *
 * CommonLII serves consolidated Malaysian statutes as plain HTML pages with
 * a predictable structure. The legislation text uses standard HTML elements
 * (headings, paragraphs, lists) rather than semantic classes.
 *
 * Malaysian statutes follow the common law tradition with "Section" numbering
 * (s1, s2, ...). The Federal Constitution uses "Article" numbering but we
 * normalise to provision_ref format: "s1", "s2", "art1", "art2".
 *
 * HTML structure on CommonLII:
 *   <h2> or <h3>: Part/Chapter headings
 *   <p> or <blockquote>: Section text
 *   Bold text with "Section N" or "N." pattern: section boundaries
 *   Indented text: subsections and paragraphs
 */

export interface ActIndexEntry {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  actNumber: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issuedDate: string;
  inForceDate: string;
  url: string;
  description?: string;
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
 * Parse CommonLII HTML to extract provisions from a Malaysian statute page.
 *
 * CommonLII pages have a relatively simple structure:
 * - The act title is typically in the page <title> or first <h1>/<h2>
 * - Parts/Chapters appear as <h2>, <h3>, or bold headings
 * - Sections begin with bold "Section N" or "N." markers
 * - Content follows in <p> tags or directly in the body
 *
 * The parsing is regex-based since CommonLII does not use semantic CSS classes.
 */
export function parseMalaysianHtml(html: string, act: ActIndexEntry): ParsedAct {
  const provisions: ParsedProvision[] = [];
  const definitions: ParsedDefinition[] = [];

  // Determine provision prefix based on act type
  const prefix = act.usesArticles ? 'art' : 's';
  const sectionLabel = act.usesArticles ? 'Article' : 'Section';

  // Extract the main content body (between first <body> and </body>, or full HTML)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // Track current chapter/part
  let currentChapter = '';

  // Strategy: split on section boundaries.
  // CommonLII uses patterns like:
  //   <b>Section 3.</b> or <b>3.</b> or <p><b>Section 3. Title</b>
  // Also handles "PART II" / "CHAPTER III" headings for chapter tracking.

  // First, extract part/chapter headings and their positions
  const chapterPattern = /(?:<h[23][^>]*>|<p[^>]*>\s*<b>)\s*((?:PART|CHAPTER|BAHAGIAN)\s+[IVXLCDM0-9]+(?:\s*[-\u2013]\s*[^<]*)?)\s*(?:<\/b>\s*<\/p>|<\/h[23]>)/gi;
  const chapterPositions: { pos: number; name: string }[] = [];
  let chapterMatch: RegExpExecArray | null;

  while ((chapterMatch = chapterPattern.exec(bodyHtml)) !== null) {
    chapterPositions.push({
      pos: chapterMatch.index,
      name: stripHtml(chapterMatch[1]).trim(),
    });
  }

  // Split HTML on section boundaries
  // Pattern matches: "Section N." or "N." at the start of a bold element or heading
  const sectionSplitPattern = new RegExp(
    `(?:<b>\\s*(?:${sectionLabel}\\s+)?(\\d+[A-Za-z]*)\\b[.]?\\s*([^<]*)<\\/b>|` +
    `<b>\\s*${sectionLabel}\\s+(\\d+[A-Za-z]*)\\b[.]?\\s*<\\/b>)`,
    'gi',
  );

  const sectionStarts: { pos: number; num: string; titleHint: string }[] = [];
  let secMatch: RegExpExecArray | null;

  while ((secMatch = sectionSplitPattern.exec(bodyHtml)) !== null) {
    const num = secMatch[1] ?? secMatch[3] ?? '';
    const titleHint = stripHtml(secMatch[2] ?? '').trim();
    if (num && /^\d+[A-Za-z]*$/.test(num)) {
      sectionStarts.push({ pos: secMatch.index, num, titleHint });
    }
  }

  // Process each section
  for (let i = 0; i < sectionStarts.length; i++) {
    const { pos, num, titleHint } = sectionStarts[i];
    const nextPos = i + 1 < sectionStarts.length ? sectionStarts[i + 1].pos : bodyHtml.length;
    const sectionHtml = bodyHtml.substring(pos, nextPos);

    // Update current chapter based on position
    for (const cp of chapterPositions) {
      if (cp.pos < pos) {
        currentChapter = cp.name;
      }
    }

    // Extract section title: either from the bold text or the next heading/bold element
    let title = titleHint;
    if (!title) {
      const titleMatch = sectionHtml.match(/<b>\s*(?:Section\s+)?\d+[A-Za-z]*\.?\s*([^<]+)<\/b>/i);
      title = titleMatch ? stripHtml(titleMatch[1]).trim() : '';
    }
    // Remove trailing period from title
    title = title.replace(/\.\s*$/, '').trim();

    // Extract full text content
    const content = stripHtml(sectionHtml);

    if (content.length > 20) {
      const provisionRef = `${prefix}${num}`;

      provisions.push({
        provision_ref: provisionRef,
        chapter: currentChapter || undefined,
        section: num,
        title,
        content: content.substring(0, 12000), // Cap at 12K chars
      });

      // Extract definitions: look for "term" means patterns
      const defPattern = /["\u201C]([^"\u201D]+)["\u201D]\s+means\s+([\s\S]*?)(?=;\s*$|;\s*["\u201C]|\.\s*$)/gm;
      let defMatch: RegExpExecArray | null;

      while ((defMatch = defPattern.exec(content)) !== null) {
        const term = defMatch[1].trim();
        const definition = `"${term}" means ${defMatch[2].trim()}`;
        if (term.length > 1 && term.length < 100) {
          definitions.push({
            term,
            definition: definition.substring(0, 4000),
            source_provision: provisionRef,
          });
        }
      }
    }
  }

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
    const existing = byTerm.get(def.term);
    if (!existing || def.definition.length > existing.definition.length) {
      byTerm.set(def.term, def);
    }
  }

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn,
    short_name: act.shortName,
    status: act.status,
    issued_date: act.issuedDate,
    in_force_date: act.inForceDate,
    url: act.url,
    description: act.description,
    provisions: Array.from(byRef.values()),
    definitions: Array.from(byTerm.values()),
  };
}

/**
 * Pre-configured list of key Malaysian Acts to ingest.
 * These are the most important Acts for cybersecurity, data protection,
 * corporate governance, and compliance use cases.
 *
 * URL patterns for CommonLII:
 *   https://www.commonlii.org/my/legis/consol_act/{slug}/
 *   Slugs derived from act title in lowercase with underscores.
 */
export const KEY_MALAYSIAN_ACTS: ActIndexEntry[] = [
  {
    id: 'pdpa-2010',
    title: 'Akta Perlindungan Data Peribadi 2010',
    titleEn: 'Personal Data Protection Act 2010',
    shortName: 'PDPA 2010',
    actNumber: 'Act 709',
    status: 'in_force',
    issuedDate: '2010-06-10',
    inForceDate: '2013-11-15',
    url: 'https://www.commonlii.org/my/legis/consol_act/pdpa2010360/',
    description: 'Regulates the processing of personal data in commercial transactions. Establishes 7 data protection principles, rights of data subjects, and the role of the Personal Data Protection Commissioner.',
  },
  {
    id: 'computer-crimes-1997',
    title: 'Akta Jenayah Komputer 1997',
    titleEn: 'Computer Crimes Act 1997',
    shortName: 'CCA 1997',
    actNumber: 'Act 563',
    status: 'in_force',
    issuedDate: '1997-06-01',
    inForceDate: '2000-06-01',
    url: 'https://www.commonlii.org/my/legis/consol_act/cca1997210/',
    description: 'Criminalises unauthorised access to computer material, unauthorised modification of computer contents, wrongful communication, and abetment/attempts. Key cybercrime statute.',
  },
  {
    id: 'cma-1998',
    title: 'Akta Komunikasi dan Multimedia 1998',
    titleEn: 'Communications and Multimedia Act 1998',
    shortName: 'CMA 1998',
    actNumber: 'Act 588',
    status: 'in_force',
    issuedDate: '1998-11-01',
    inForceDate: '1999-04-01',
    url: 'https://www.commonlii.org/my/legis/consol_act/cama1998330/',
    description: 'Comprehensive regulation of communications and multimedia industries in Malaysia. Establishes MCMC (Malaysian Communications and Multimedia Commission) and governs licensing, content regulation, and technical standards.',
  },
  {
    id: 'companies-2016',
    title: 'Akta Syarikat 2016',
    titleEn: 'Companies Act 2016',
    shortName: 'CA 2016',
    actNumber: 'Act 777',
    status: 'in_force',
    issuedDate: '2016-09-15',
    inForceDate: '2017-01-31',
    url: 'https://www.commonlii.org/my/legis/consol_act/ca2016139/',
    description: 'Governs company incorporation, management, and dissolution in Malaysia. Includes provisions on corporate governance, directors duties, financial reporting, and compliance requirements.',
  },
  {
    id: 'eca-2006',
    title: 'Akta Perdagangan Elektronik 2006',
    titleEn: 'Electronic Commerce Act 2006',
    shortName: 'ECA 2006',
    actNumber: 'Act 658',
    status: 'in_force',
    issuedDate: '2006-01-01',
    inForceDate: '2006-10-19',
    url: 'https://www.commonlii.org/my/legis/consol_act/eca2006203/',
    description: 'Provides legal recognition for electronic messages in commercial transactions. Covers formation of contracts, attribution, acknowledgment, and dispatch/receipt of electronic messages.',
  },
  {
    id: 'sta-2010',
    title: 'Akta Perdagangan Strategik 2010',
    titleEn: 'Strategic Trade Act 2010',
    shortName: 'STA 2010',
    actNumber: 'Act 708',
    status: 'in_force',
    issuedDate: '2010-06-10',
    inForceDate: '2011-07-01',
    url: 'https://www.commonlii.org/my/legis/consol_act/sta2010199/',
    description: 'Controls export, transhipment, transit, and brokering of strategic items, including technology and software relevant to weapons of mass destruction and military end-use.',
  },
  {
    id: 'federal-constitution',
    title: 'Perlembagaan Persekutuan',
    titleEn: 'Federal Constitution',
    shortName: 'Federal Constitution',
    actNumber: 'Constitution',
    status: 'in_force',
    issuedDate: '1957-08-31',
    inForceDate: '1957-08-31',
    url: 'https://www.commonlii.org/my/legis/consol_act/fc/',
    usesArticles: true,
    description: 'Supreme law of Malaysia. Establishes fundamental liberties (Part II), federal-state relations, citizenship, and the structure of government. Article 5 (liberty), Article 10 (expression), Article 13 (property) are key for digital rights.',
  },
  {
    id: 'penal-code',
    title: 'Kanun Keseksaan',
    titleEn: 'Penal Code',
    shortName: 'Penal Code',
    actNumber: 'Act 574',
    status: 'in_force',
    issuedDate: '1936-01-01',
    inForceDate: '1936-01-01',
    url: 'https://www.commonlii.org/my/legis/consol_act/pc182/',
    description: 'Comprehensive criminal code. Includes provisions on cheating (s415-s420), criminal breach of trust (s405-s409), mischief including computer damage (s425-s440), forgery including electronic documents (s463-s477A), and criminal intimidation.',
  },
  {
    id: 'evidence-act-1950',
    title: 'Akta Keterangan 1950',
    titleEn: 'Evidence Act 1950',
    shortName: 'EA 1950',
    actNumber: 'Act 56',
    status: 'in_force',
    issuedDate: '1950-01-01',
    inForceDate: '1950-01-01',
    url: 'https://www.commonlii.org/my/legis/consol_act/ea195080/',
    description: 'Governs admissibility of evidence in court. Section 90A-90C cover admissibility of electronic documents and computer-generated evidence. Critical for cybercrime prosecution and digital forensics.',
  },
  {
    id: 'cpa-1999',
    title: 'Akta Pelindungan Pengguna 1999',
    titleEn: 'Consumer Protection Act 1999',
    shortName: 'CPA 1999',
    actNumber: 'Act 599',
    status: 'in_force',
    issuedDate: '1999-11-15',
    inForceDate: '1999-11-15',
    url: 'https://www.commonlii.org/my/legis/consol_act/cpa1999304/',
    description: 'Protects consumers against unfair practices, misleading conduct, unsafe goods and services. Part IIIA covers e-commerce consumer protection including online marketplace obligations.',
  },
];
