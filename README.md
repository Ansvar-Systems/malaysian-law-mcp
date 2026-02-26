# Malaysian Law MCP Server

**The Laws of Malaysia alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fmalaysian-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/malaysian-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/malaysian-law-mcp?style=social)](https://github.com/Ansvar-Systems/malaysian-law-mcp)
[![CI](https://github.com/Ansvar-Systems/malaysian-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/malaysian-law-mcp/actions/workflows/ci.yml)
[![Daily Data Check](https://github.com/Ansvar-Systems/malaysian-law-mcp/actions/workflows/check-updates.yml/badge.svg)](https://github.com/Ansvar-Systems/malaysian-law-mcp/actions/workflows/check-updates.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](#whats-included)
[![Provisions](https://img.shields.io/badge/provisions-24%2C514-blue)](#whats-included)

Query **589 Malaysian federal statutes** -- from the Computer Crimes Act and Anti-Money Laundering Act to the Employment Act, Income Tax Act, and more -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Malaysian legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Malaysian legal research is scattered across the AGC portal (lom.agc.gov.my), CommonLII, and various government gazettes. Whether you're:
- A **lawyer** validating citations in a brief or contract
- A **compliance officer** checking data protection or AML obligations
- A **legal tech developer** building tools on Malaysian law
- A **researcher** tracing legislative provisions

...you shouldn't need to navigate multiple sources and PDFs manually. Ask Claude. Get the exact provision. With context.

This MCP server makes Malaysian law **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version -- zero dependencies, nothing to install.

**Endpoint:** `https://malaysian-law-mcp.vercel.app/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add malaysian-law --transport http https://malaysian-law-mcp.vercel.app/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "malaysian-law": {
      "type": "url",
      "url": "https://malaysian-law-mcp.vercel.app/mcp"
    }
  }
}
```

**GitHub Copilot** -- add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "malaysian-law": {
      "type": "http",
      "url": "https://malaysian-law-mcp.vercel.app/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/malaysian-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "malaysian-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/malaysian-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "malaysian-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/malaysian-law-mcp"]
    }
  }
}
```

## Example Queries

Once connected, just ask naturally:

- *"What does the Computer Crimes Act 1997 say about unauthorised access?"*
- *"Find provisions about money laundering in Malaysian law"*
- *"What are the penalties under the Anti-Money Laundering Act 2001?"*
- *"Show me Section 2 of the Employment Act 1955 -- the definitions"*
- *"What does the Communications and Multimedia Act say about licensing?"*
- *"Find provisions about evidence and computer documents"*
- *"What are the offences under the Arms Act?"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Statutes** | 589 statutes | Comprehensive Malaysian federal legislation |
| **Provisions** | 24,514 sections | Full-text searchable with FTS5 |
| **Legal Definitions** | 5,830 definitions | Extracted from interpretation sections |
| **Database Size** | ~42 MB | Optimized SQLite, portable |
| **Census Coverage** | 664 Acts enumerated | 589 ingestable, 75 repealed (metadata only) |

**Verified data only** -- every provision is ingested from CommonLII (AustLII), which hosts the official English text of Malaysian consolidated statutes. Zero LLM-generated content.

**Note:** The CommonLII Malaysian legislation database was last updated in March 2010. Acts enacted after that date (e.g., PDPA 2010, Companies Act 2016) are not yet available from this source. A future update will supplement from AGC (lom.agc.gov.my) for post-2010 legislation.

---

## See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from CommonLII official sources
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains regulation text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by act title + section number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
CommonLII Index --> Census --> Ingest --> Parse --> SQLite --> FTS5 snippet() --> MCP response
                     |                     |                       |
              664 Acts enumerated   Section parser         Verbatim database query
```

---

## Available Tools (8 core + 5 EU)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 search on 24,514 provisions with BM25 ranking |
| `get_provision` | Retrieve specific provision by act title + section number |
| `search_case_law` | FTS5 search on case law (reserved for future expansion) |
| `get_preparatory_works` | Get linked preparatory documents (reserved) |
| `validate_citation` | Validate citation against database (zero-hallucination check) |
| `build_legal_stance` | Aggregate citations from statutes and cross-references |
| `format_citation` | Format citations per Malaysian conventions |
| `check_currency` | Check if statute is in force, amended, or repealed |

### EU Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get EU directives/regulations referenced in Malaysian statutes |
| `get_malaysian_implementations` | Find Malaysian laws implementing international frameworks |
| `search_eu_implementations` | Search EU documents with Malaysian implementation counts |
| `get_provision_eu_basis` | Get international law references for specific provision |
| `validate_eu_compliance` | Check implementation status |

---

## Malaysian Legal System Context

- **Legal system:** Mixed -- common law (British heritage), Islamic law (Syariah), and customary law (adat)
- **Language:** Malay is official; the Malay text prevails in case of conflict (National Language Act 1963/67). However, legislation is available in both Malay and English.
- **Act numbering:** Federal legislation uses "Act NNN" identifiers (e.g., Act 709 = PDPA 2010)
- **Structure:** Sections (not Articles) -- common law tradition (s1, s2, s3...)
- **Key regulators:** PDP Commissioner, MCMC, Bank Negara Malaysia, Securities Commission
- **ASEAN member:** Participates in ASEAN Framework on Personal Data Protection

### Key Acts by Domain

| Domain | Acts | Significance |
|--------|------|-------------|
| **Cybercrime** | Computer Crimes Act 1997 (Act 563) | Unauthorised access, modification, interception |
| **Telecom** | Communications and Multimedia Act 1998 (Act 588) | MCMC, licensing, content regulation |
| **Finance** | Anti-Money Laundering Act 2001, Income Tax Act 1967 | AML/CFT obligations, fiscal compliance |
| **Employment** | Employment Act 1955 | Labour rights, minimum standards |
| **Evidence** | Evidence Act 1950 | Admissibility of electronic evidence (s90A-90C) |
| **Criminal** | Penal Code (Revised 1997) | General criminal offences including cyber-related |
| **Consumer** | Consumer Protection Act 1999 | E-commerce consumer protection |

---

## Data Sources & Freshness

All content is sourced from authoritative legal databases:

- **[CommonLII](https://www.commonlii.org/my/legis/)** -- AustLII's free legal information institute, hosting consolidated Malaysian statutes
- **[AGC Malaysia](https://lom.agc.gov.my)** -- Official Attorney General's Chambers portal (planned for post-2010 supplement)

### Census-Driven Ingestion

The ingestion pipeline uses a **census-first** approach:

| Step | Script | Output |
|------|--------|--------|
| **Census** | `npm run census` | `data/census.json` -- enumerates all 664 Acts |
| **Ingest** | `npm run ingest` | `data/seed/*.json` -- fetches and parses all provisions |
| **Build** | `npm run build:db` | `data/database.db` -- SQLite with FTS5 |

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Docker Security** | Container image scanning + SBOM generation | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **OSSF Scorecard** | OpenSSF best practices scoring | Weekly |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from CommonLII's consolidated collection. However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Coverage is limited to pre-2010 legislation** -- PDPA 2010 and later Acts are not yet included
> - **Verify critical citations** against primary sources (lom.agc.gov.my) for court filings
> - **The Malay text prevails** in case of conflict between English and Malay versions

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [PRIVACY.md](PRIVACY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment. See [PRIVACY.md](PRIVACY.md) for professional compliance guidance.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/malaysian-law-mcp
cd malaysian-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run census                              # Enumerate all Acts from CommonLII
npm run ingest                              # Full census-driven ingestion
npm run ingest -- --limit 10                # Test with 10 acts
npm run ingest -- --resume                  # Resume interrupted ingestion
npm run ingest -- --skip-fetch              # Reuse cached HTML
npm run build:db                            # Rebuild SQLite database
npm run check-updates                       # Check for amendments
npm run drift:detect                        # Detect data drift
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** ~42 MB (efficient, portable)
- **Ingestion Success Rate:** 100% (589/589 Acts)
- **Ingestion Time:** ~9 minutes for full corpus

---

## Contract Tests

This MCP includes 12 golden contract tests covering:
- 5 article retrieval tests (Computer Crimes Act s3, CMA s1, Evidence Act s3, AML Act s4, Employment Act s2)
- 3 search tests (computer crimes, money laundering, income tax)
- 2 citation roundtrip tests (commonlii.org URL patterns)
- 2 negative tests (non-existent Act, malformed section)

Run with: `npm run test:contract`

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/US_Compliance_MCP)
**Query US federal and state compliance laws** -- HIPAA, CCPA, SOX, GLBA, FERPA, and more. `npm install @ansvar/us-regulations-mcp`

### @ansvar/malaysian-law-mcp (This Project)
**Query 589 Malaysian federal statutes directly from Claude** -- Computer Crimes Act, AML Act, Evidence Act, Employment Act, and more. Full provision text with FTS5 search. `npx @ansvar/malaysian-law-mcp`

### [@ansvar/sanctions-mcp](https://github.com/Ansvar-Systems/Sanctions-MCP)
**Offline-capable sanctions screening** -- OFAC, EU, UN sanctions lists. `pip install ansvar-sanctions-mcp`

---

## Roadmap

- [x] **Census-first full corpus ingestion** -- 589 Acts, 24,514 provisions from CommonLII
- [x] **FTS5 search** -- unicode61 tokenizer for English and Malay terms
- [x] **Legal definitions extraction** -- 5,830 definitions from interpretation sections
- [ ] AGC supplement for post-2010 legislation (PDPA 2010, Companies Act 2016, etc.)
- [ ] Court case law integration
- [ ] Subsidiary legislation (P.U.(A), P.U.(B))
- [ ] Historical statute versions (amendment tracking)
- [ ] Federal Constitution with Article-level parsing

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{malaysian_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Malaysian Law MCP Server: Production-Grade Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/malaysian-law-mcp},
  note = {Comprehensive Malaysian legal database with 589 statutes and 24,514 provisions}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Legislation:** Malaysian Government (public domain / government work product)
- **Source Database:** CommonLII (open access via AustLII)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. This MCP server started as part of our coverage of ASEAN jurisdictions -- Malaysian law is critical for cross-border compliance in Southeast Asia.

So we're open-sourcing it. Navigating 589 statutes shouldn't require manual PDF searching.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
