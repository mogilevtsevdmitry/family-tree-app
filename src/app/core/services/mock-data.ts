import { FamilyMember, Gender } from '../models/family-member.model';
import { Relationship, RelationshipType } from '../models/relationship.model';

export let mockMembers: FamilyMember[] = [
  // Текущее поколение
  {
    id: '1',
    firstName: 'Дмитрий',
    lastName: 'Могилевцев',
    middleName: 'Александрович',
    gender: Gender.Male,
    birthDate: new Date(1991, 2, 23),
    occupation: 'Программист',
    location: 'Тюмень',
  },
  {
    id: '2',
    firstName: 'Мария',
    lastName: 'Седлецкая',
    middleName: 'Сергеевна',
    gender: Gender.Female,
    birthDate: new Date(1990, 0, 23),
    occupation: 'Психолог',
    location: 'Тюмень',
  },
  // Родители
  {
    id: '3',
    firstName: 'Александр',
    lastName: 'Могилевцев',
    middleName: 'Васильевич',
    gender: Gender.Male,
    birthDate: new Date(1965, 5, 30),
    occupation: 'Водитель погрузчика',
    location: 'Новороссийск',
  },
  {
    id: '4',
    firstName: 'Ирина',
    lastName: 'Могилевцева',
    middleName: 'Николаевна',
    gender: Gender.Female,
    birthDate: new Date(1971, 0, 9),
    occupation: 'Нотариус',
    location: 'Новороссийск',
  },
  // Дети
  {
    id: '5',
    firstName: 'Арина',
    lastName: 'Могилевцева',
    gender: Gender.Female,
    birthDate: new Date(2019, 8, 3),
    location: 'Тюмень',
  },
  {
    id: '6',
    firstName: 'Ксения',
    lastName: 'Могилевцева',
    gender: Gender.Female,
    birthDate: new Date(2014, 3, 2),
    location: 'Тюмень',
  },
  // Дедушка и бабушка
  {
    id: '7',
    firstName: 'Николай',
    lastName: 'Беда',
    middleName: 'Сергеевич',
    gender: Gender.Male,
    birthDate: new Date(1944, 10, 1),
    occupation: 'Инженер-строитель',
    location: 'Новороссийск',
  },
  {
    id: '8',
    firstName: 'Валентина',
    lastName: 'Беда',
    middleName: 'Ивановна',
    gender: Gender.Female,
    birthDate: new Date(1946, 7, 17),
    occupation: 'Инженер-строитель',
    location: 'Новороссийск',
  },
  {
    id: '9',
    firstName: 'Алёна',
    lastName: 'Балалаева',
    middleName: 'Александровна',
    gender: Gender.Female,
    birthDate: new Date(1992, 4, 18),
    location: 'Новороссийск',
  },
  {
    id: '10',
    firstName: 'Василий',
    lastName: 'Могилевцев',
    gender: Gender.Male,
  },
  {
    id: '11',
    firstName: 'Зоя',
    lastName: 'Могилевцева',
    gender: Gender.Female,
  },
  // Сестра Валентины
  {
    id: '12',
    firstName: 'Любовь',
    lastName: 'Баева',
    middleName: 'Ивановна',
    gender: Gender.Female,
    birthDate: new Date(1948, 3, 15),
    occupation: 'Учитель',
    location: 'Новороссийск',
  },
];

export let mockRelationships: Relationship[] = [
  { id: 'r1', sourceId: '1', targetId: '2', type: RelationshipType.Spouse },
  { id: 'r2', sourceId: '1', targetId: '5', type: RelationshipType.Daughter },
  { id: 'r3', sourceId: '2', targetId: '5', type: RelationshipType.Daughter },
  { id: 'r4', sourceId: '1', targetId: '6', type: RelationshipType.Daughter },
  { id: 'r5', sourceId: '2', targetId: '6', type: RelationshipType.Daughter },
  { id: 'r6', sourceId: '3', targetId: '1', type: RelationshipType.Son },
  { id: 'r7', sourceId: '4', targetId: '1', type: RelationshipType.Son },
  { id: 'r8', sourceId: '3', targetId: '4', type: RelationshipType.Spouse },
  { id: 'r9', sourceId: '3', targetId: '9', type: RelationshipType.Daughter },
  { id: 'r10', sourceId: '4', targetId: '9', type: RelationshipType.Daughter },
  { id: 'r11', sourceId: '7', targetId: '4', type: RelationshipType.Daughter },
  { id: 'r12', sourceId: '8', targetId: '4', type: RelationshipType.Daughter },
  { id: 'r13', sourceId: '7', targetId: '8', type: RelationshipType.Spouse },
  { id: 'r14', sourceId: '10', targetId: '3', type: RelationshipType.Son },
  { id: 'r15', sourceId: '11', targetId: '3', type: RelationshipType.Son },
  { id: 'r16', sourceId: '10', targetId: '11', type: RelationshipType.Spouse },
  { id: 'r17', sourceId: '8', targetId: '12', type: RelationshipType.Sister },
];

export function addMember(member: FamilyMember): FamilyMember[] {
  mockMembers.push(member);
  return [...mockMembers];
}

export function updateMember(member: FamilyMember): void {
  const index = mockMembers.findIndex((m) => m.id === member.id);
  if (index !== -1) {
    mockMembers[index] = member;
  }
}

export function deleteMember(memberId: string): void {
  mockMembers = mockMembers.filter((m) => m.id !== memberId);
  mockRelationships = mockRelationships.filter(
    (r) => r.sourceId !== memberId && r.targetId !== memberId
  );
}

export function addRelationship(relationship: Relationship) {
  const exists = mockRelationships.some(
    (rel) =>
      rel.sourceId === relationship.sourceId &&
      rel.targetId === relationship.targetId &&
      rel.type === relationship.type
  );

  if (!exists) {
    mockRelationships.push(relationship);
  }

  return mockRelationships;
}

export function deleteRelationship(relationshipId: string): void {
  mockRelationships = mockRelationships.filter((r) => r.id !== relationshipId);
}
