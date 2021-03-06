
export * from './la-atom';
export * from './la-sentence';
export * from './la-decisionNode';
export * from './la-stats';
export * from './la-paragraph';
export * from './la-legalCase';
export * from './la-user';
export * from './la-teams';
export * from './la-caseDirectoryItem';

export * from './search-result';

export const TOPIC_TextSearch = 'TextSearch';
export const TOPIC_FindingsOnlySearch = 'FindingsOnlySearch';
export const TOPIC_AdvancedQuery = 'AdvancedQuery';

export interface iQuery {
    rhetclass: string;
    includeall: string;
    includeany: string;
    exactphrase: string;
    excludeany: string;
}
