export interface CharacterTraits {
  competence: number;
  integrity: number;
  loyalty: number;
  ambition: number;
  communication: number;
  leadership: number;
}

export interface Character {
  id: string;
  fullName: string;
  age: number;
  background: string;
  partyId?: string;
  traits: CharacterTraits;
  relationships: Record<string, number>;
  portraitAssetId: string;
  role: 'president' | 'vice_president' | 'minister' | 'party_leader' | 'dpr' | 'advisor' | 'journalist' | 'regional' | 'civil_society';
}

export interface GovernmentPosition {
  id: string;
  title: string;
  ministryId?: string;
  currentHolderId?: string;
}

export interface CabinetAppointment {
  id: string;
  characterId: string;
  positionId: string;
  startTurn: number;
  endTurn?: number;
  appointmentReason: string;
  dismissalReason?: string;
}

export interface Party {
  id: string;
  name: string;
  leaderId: string;
  factions: string[];
  preferences: string[];
  coalition: number;
}

export interface PoliticalEvent {
  id: string;
  turn: number;
  title: string;
  kind: 'support' | 'scrutiny' | 'realignment';
}

export interface GameState {
  turn: number;
  seed: number;
  positions: Record<string, GovernmentPosition>;
  characters: Record<string, { partyId?: string; relationships: Record<string, number> }>;
  parties: Record<string, Party>;
  appointments: CabinetAppointment[];
  events: PoliticalEvent[];
}
