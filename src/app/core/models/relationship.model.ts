import { FamilyMember, Gender } from './family-member.model';

export enum RelationshipType {
  Father = 'father',
  Mother = 'mother',
  Son = 'son',
  Daughter = 'daughter',
  Brother = 'brother',
  Sister = 'sister',
  Spouse = 'spouse',
  ExSpouse = 'ex-spouse',
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  startDate?: Date;
  endDate?: Date;
  gender?: Gender;
}

export interface RelationshipView {
  relationship: Relationship;
  person: FamilyMember;
}
