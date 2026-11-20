export type PresidentGender = 'male' | 'female';
export type PresidentIdentity = {
  name: string;
  gender: PresidentGender;
  address: 'standard' | 'neutral';
  portrait: 'bima_aditya_pratama' | 'laras_prameswari';
};

export type OpeningPolicy = 'relief' | 'logistics';
export type CoalitionReply = 'oversight' | 'autonomy';
export type OpeningState =
  | { stage: 'inauguration' | 'briefing' }
  | { stage: 'negotiation'; policy: OpeningPolicy; adviserId: string }
  | {
    stage: 'results' | 'complete'; policy: OpeningPolicy; reply: CoalitionReply; adviserId: string;
    effects: { legitimacy: number; trust: number; relationship: number };
  };
