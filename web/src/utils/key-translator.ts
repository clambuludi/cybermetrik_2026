import slugMapping from './slug-mapping-data.json';

const mapping: Record<string, string> = slugMapping;

/**
 * Translates old checklist slug keys to new standardized slug keys.
 * Handles both the nested structures (checkedItems, etc.) and any flat root-level keys.
 */
export function translateKeys(parsedData: any): any {
  if (!parsedData || typeof parsedData !== 'object') {
    return parsedData;
  }

  // Create a deep copy to avoid mutating original objects
  const result = { ...parsedData };

  // Helper to map keys of a record
  const mapRecord = (record: any) => {
    if (!record || typeof record !== 'object') return record;
    const newRecord: any = {};
    for (const key of Object.keys(record)) {
      const mappedKey = mapping[key] || key;
      newRecord[mappedKey] = record[key];
    }
    return newRecord;
  };

  // Map known nested objects
  if (result.checkedItems) {
    result.checkedItems = mapRecord(result.checkedItems);
  }
  if (result.progresoParcialDecimal) {
    result.progresoParcialDecimal = mapRecord(result.progresoParcialDecimal);
  }
  if (result.ignoredItems) {
    result.ignoredItems = mapRecord(result.ignoredItems);
  }
  if (result.evidenceLinks) {
    result.evidenceLinks = mapRecord(result.evidenceLinks);
  }
  if (result.justifications) {
    result.justifications = mapRecord(result.justifications);
  }

  // Map any flat keys at the root level (excluding known non-checklist properties)
  const nonChecklistKeys = new Set([
    'checkedItems',
    'progresoParcialDecimal',
    'ignoredItems',
    'evidenceLinks',
    'justifications',
    'isoScore',
    'egsiScore',
    'clausesScore',
    'score',
    'completedCount',
    'totalCount',
    'userName',
    'finalize'
  ]);

  for (const key of Object.keys(result)) {
    if (!nonChecklistKeys.has(key)) {
      const mappedKey = mapping[key];
      if (mappedKey && mappedKey !== key) {
        result[mappedKey] = result[key];
        delete result[key];
      }
    }
  }

  return result;
}
