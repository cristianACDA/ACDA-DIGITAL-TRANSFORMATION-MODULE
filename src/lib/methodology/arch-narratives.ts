/**
 * Narativele celor 6 arhitecturi, per bandă de maturitate.
 *
 * STRUCTURĂ-SCHELET (V1.1): tipurile și API-ul sunt stabile, dar CONȚINUTUL client-facing
 * (`text`) trebuie validat ca copy ACDA înainte de expunere în UI. Nu se cablează în
 * pagini până la V1.2 + aprobare copy. Vezi BRIEF Redesign v2.0 §2 + naming §1.
 */

import type { NivelMaturitate } from "../../contracts/agent-contracts";
import { ARCH_KEYS, type ArchKey } from "./arch-definitions";

/** Un fragment narativ pentru o arhitectură la un anumit nivel de maturitate. */
export interface ArchNarrative {
  /** Titlu scurt pentru card. */
  titlu: string;
  /** Corp narativ client-facing. TODO(copy-ACDA): de înlocuit cu text validat. */
  text: string;
}

/** Narative indexate pe arhitectură × nivel. Conținut provizoriu — vezi TODO de mai sus. */
export type ArchNarratives = Record<ArchKey, Record<NivelMaturitate, ArchNarrative>>;

const NIVELE: NivelMaturitate[] = ["NECONFORM", "IN_PROGRES", "CONFORM", "LIDER"];

/**
 * Generează scheletul de narative (placeholdere) pentru toate combinațiile.
 * Folosit doar ca structură tipizată; textul real se completează la V1.2.
 */
function buildPlaceholderNarratives(): ArchNarratives {
  const out = {} as ArchNarratives;
  for (const key of ARCH_KEYS) {
    out[key] = {} as Record<NivelMaturitate, ArchNarrative>;
    for (const nivel of NIVELE) {
      out[key][nivel] = {
        titlu: `${key} — ${nivel}`,
        text: "", // TODO(copy-ACDA): completare la V1.2, înainte de expunere în UI.
      };
    }
  }
  return out;
}

/** Narativele curente (placeholder). NU se folosesc în UI până la validare copy. */
export const ARCH_NARRATIVES: ArchNarratives = buildPlaceholderNarratives();

/**
 * Întoarce narativa pentru o arhitectură la un nivel dat.
 * @param key Arhitectura.
 * @param nivel Nivelul de maturitate.
 */
export function getArchNarrative(
  key: ArchKey,
  nivel: NivelMaturitate,
): ArchNarrative {
  return ARCH_NARRATIVES[key][nivel];
}
