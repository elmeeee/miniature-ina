import type { PresidentGender, PresidentIdentity } from '@republik/shared-types';

const names = {
  male: ['Bima Aditya Pratama', 'Bagas Arya Mahendra', 'Rangga Damar Jayanto', 'Rama Satya Wardana'],
  female: ['Aruna Kirana Pratama', 'Nadia Ratri Kusuma', 'Intan Sekar Wardani', 'Anisa Pertiwi Mahendra'],
};

export function presidentName(gender: PresidentGender, index = 0) {
  return names[gender][index % names[gender].length];
}

export function newPresident(name: string, gender: PresidentGender, address: PresidentIdentity['address']): PresidentIdentity {
  const normalized = name.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!/\p{L}/u.test(normalized) || /[\p{Cc}\p{Cf}]/u.test(normalized) || [...normalized].length > 48) {
    throw new Error('Masukkan nama yang memuat huruf dan maksimal 48 karakter.');
  }
  if ((gender !== 'male' && gender !== 'female') || (address !== 'standard' && address !== 'neutral')) throw new Error('Profil Presiden tidak valid.');
  return { name: normalized, gender, address, portrait: gender === 'female' ? 'laras_prameswari' : 'bima_aditya_pratama' };
}

export const defaultPresident = newPresident(presidentName('male'), 'male', 'standard');

export function isPresident(value: PresidentIdentity) {
  if (!value || typeof value.name !== 'string') return false;
  try {
    const normalized = newPresident(value.name, value.gender, value.address);
    return value.name === normalized.name && value.portrait === normalized.portrait;
  } catch {
    return false;
  }
}

export function salutation(president: PresidentIdentity) {
  if (president.address === 'neutral') return 'Presiden';
  return president.gender === 'female' ? 'Ibu Presiden' : 'Bapak Presiden';
}
