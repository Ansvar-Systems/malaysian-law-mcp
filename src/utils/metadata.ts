/**
 * Response metadata utilities for Malaysian Law MCP.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  freshness?: string;
  note?: string;
  query_strategy?: string;
}

export interface ToolResponse<T> {
  results: T;
  _metadata: ResponseMetadata;
}

export function generateResponseMetadata(
  db: InstanceType<typeof Database>,
): ResponseMetadata {
  let freshness: string | undefined;
  try {
    const row = db.prepare(
      "SELECT value FROM db_metadata WHERE key = 'built_at'"
    ).get() as { value: string } | undefined;
    if (row) freshness = row.value;
  } catch {
    // Ignore
  }

  return {
    data_source: "Federal Gazette (lom.agc.gov.my) — Malaysian Attorney General's Chambers",
    jurisdiction: 'MY',
    disclaimer:
      "This data is sourced from the Laws of Malaysia Online portal. The authoritative versions are maintained by the Malaysian Attorney General's Chambers. Always verify with the official portal (lom.agc.gov.my).",
    freshness,
  };
}
