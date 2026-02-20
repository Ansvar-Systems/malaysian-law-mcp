# Malaysian Law MCP

[![npm](https://img.shields.io/npm/v/@ansvar/malaysian-law-mcp)](https://www.npmjs.com/package/@ansvar/malaysian-law-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![CI](https://github.com/Ansvar-Systems/malaysian-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/malaysian-law-mcp/actions/workflows/ci.yml)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-green)](https://registry.modelcontextprotocol.io/)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/Ansvar-Systems/malaysian-law-mcp)](https://securityscorecards.dev/viewer/?uri=github.com/Ansvar-Systems/malaysian-law-mcp)

A Model Context Protocol (MCP) server providing comprehensive access to Malaysian legislation, including the Personal Data Protection Act 2010 (PDPA), Computer Crimes Act 1997, Communications and Multimedia Act 1998, Companies Act 2016, and Electronic Commerce Act 2006 with full-text search.

## Deployment Tier

**MEDIUM** -- Dual tier, bundled free database shipped with the npm package. Full database available via separate download.

**Estimated database size:** ~80-160 MB (free tier), ~300-600 MB (professional tier with subsidiary legislation and case law)

## Key Legislation Covered

| Act | Act Number | Year | Significance |
|-----|-----------|------|-------------|
| **Personal Data Protection Act (PDPA)** | Act 709 | 2010 | One of the first comprehensive Asian DPA laws; does NOT apply to federal/state governments; recent amendments expanding scope |
| **Computer Crimes Act** | Act 563 | 1997 | Criminalises unauthorised access, interception, and modification of computer systems |
| **Communications and Multimedia Act** | Act 588 | 1998 | Regulates converging telecommunications, broadcasting, and online industries |
| **Companies Act** | Act 777 | 2016 | Modern corporate governance framework, directors' duties, company registration |
| **Electronic Commerce Act** | Act 658 | 2006 | Legal recognition of electronic messages, signatures, and contracts |
| **Strategic Trade Act** | Act 708 | 2010 | Controls on strategic items, technology transfer, and brokering |
| **Federal Constitution** | - | 1957 | Supreme law; Article 5 protects personal liberty |

## Regulatory Context

- **Data Protection Supervisory Authority:** PDP Commissioner (Jabatan Perlindungan Data Peribadi) under Ministry of Communications and Digital
- **Telecommunications Regulator:** Malaysian Communications and Multimedia Commission (MCMC)
- **Malaysia's PDPA 2010** was one of the first comprehensive data protection laws in Asia; notably it does NOT apply to federal and state governments
- Recent PDPA amendments (2024) expand scope including mandatory data breach notification obligations
- Malaysia uses a mixed legal system: common law (British heritage), Islamic law (Syariah), and customary law (adat)
- The Malay text prevails in case of conflict (National Language Act 1963/67), but legislation is available in both Malay and English
- Malaysia is an ASEAN member and participates in the ASEAN Framework on Personal Data Protection
- The Act numbering system is the standard identifier (e.g., Act 709 = PDPA 2010)

## Data Sources

| Source | Authority | Method | Update Frequency | License | Coverage |
|--------|-----------|--------|-----------------|---------|----------|
| [Attorney General's Chambers (agc.gov.my)](https://www.agc.gov.my) | Attorney General's Chambers | HTML Scrape | Weekly | Government Open Data | All Acts of Parliament, subsidiary legislation, Federal Constitution |
| [CommonLII Malaysia](https://www.commonlii.org/my/legis/) | CommonLII | HTML Scrape | Monthly | Open Access | Consolidated Acts, historical versions |

> Full provenance metadata: [`sources.yml`](./sources.yml)

## Installation

```bash
npm install -g @ansvar/malaysian-law-mcp
```

## Usage

### As stdio MCP server

```bash
malaysian-law-mcp
```

### In Claude Desktop / MCP client configuration

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

## Available Tools

| Tool | Description |
|------|-------------|
| `get_provision` | Retrieve a specific section from a Malaysian Act |
| `search_legislation` | Full-text search across all Malaysian legislation in English and Malay |
| `get_provision_eu_basis` | Cross-reference lookup for international framework relationships (GDPR, ASEAN, etc.) |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run contract tests
npm run test:contract

# Run all validation
npm run validate

# Build database from sources
npm run build:db

# Start server
npm start
```

## Contract Tests

This MCP includes 12 golden contract tests covering:
- 4 article retrieval tests (PDPA s4, Computer Crimes Act s3, Companies Act s1, CMA s1)
- 3 search tests (data peribadi, jenayah komputer, syarikat)
- 2 citation roundtrip tests (official agc.gov.my URL patterns)
- 1 cross-reference test (PDPA to GDPR)
- 2 negative tests (non-existent Act, malformed section)

Run with: `npm run test:contract`

## Malaysian Act Numbering

Malaysia uses an Act numbering system for federal legislation:

| Act Number | Name | Year |
|-----------|------|------|
| Act 709 | Personal Data Protection Act | 2010 |
| Act 563 | Computer Crimes Act | 1997 |
| Act 588 | Communications and Multimedia Act | 1998 |
| Act 777 | Companies Act | 2016 |
| Act 658 | Electronic Commerce Act | 2006 |

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability disclosure policy.

Report data errors: [Open an issue](https://github.com/Ansvar-Systems/malaysian-law-mcp/issues/new?template=data-error.md)

## License

Apache-2.0 -- see [LICENSE](./LICENSE)

---

Built by [Ansvar Systems](https://ansvar.eu) -- Cybersecurity compliance through AI-powered analysis.
