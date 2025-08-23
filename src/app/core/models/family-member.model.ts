export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: Date;
  deathDate?: Date;
  gender: Gender;
  photoUrl?: string;
  biography?: string;
  occupation?: string;
  location?: string;
}
