/**
* Attribution: 
*  This workaround is was written by github:hippotastic in expressive-code/expressive-code
*  https://github.com/expressive-code/expressive-code/blob/main/packages/%40expressive-code/plugin-shiki/src/languages.ts
*/

import type { 
  LanguageRegistration as ShikiLanguageRegistration,
  MaybeGetter,
  MaybeArray
} from 'shiki';

// Extract or rebuild non-exported types from Shiki
type IShikiRawRepository = ShikiLanguageRegistration['repository'];
type IShikiRawRule = IShikiRawRepository[keyof IShikiRawRepository];
type ILocation = IShikiRawRepository['$vscodeTextmateLocation'];

interface ILocatable {
  readonly $vscodeTextmateLocation?: ILocation;
}

// Define modified versions of internal Shiki types that use our less strict `IRawRule`
interface IRawRepositoryMap {
  [name: string]: IRawRule;
}
type IRawRepository = IRawRepositoryMap & ILocatable;

interface IRawCapturesMap {
  [captureId: string]: IRawRule;
}
type IRawCaptures = IRawCapturesMap & ILocatable;

// Create our less strict version of Shiki's internal `IRawRule` interface
interface IRawRule extends Omit<IShikiRawRule, 'applyEndPatternLast' | 'captures' | 'patterns'> {
  readonly applyEndPatternLast?: boolean | number;
  readonly captures?: IRawCaptures;
  readonly comment?: string;
  readonly patterns?: IRawRule[];
}

/**
 * A less strict version of Shiki's `LanguageRegistration` interface that aligns better with
 * actual grammars found in the wild. This version attempts to reduce the amount
 * of type errors that would occur when importing and adding external grammars,
 * while still being supported by the language processing code.
 */
export interface LanguageRegistration extends Omit<ShikiLanguageRegistration, 'repository'> {
  repository?: IRawRepository;
}

export type LanguageInput = MaybeGetter<MaybeArray<LanguageRegistration>>;

export type { ShikiLanguageRegistration };

