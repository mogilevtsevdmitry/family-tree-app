// src/app/core/services/family-tree.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FamilyMember, Gender } from '../models/family-member.model';
import {
  Relationship,
  RelationshipType,
  RelationshipView,
} from '../models/relationship.model';
import { TreeNode } from '../models/tree-node.model';

@Injectable({
  providedIn: 'root',
})
export class FamilyTreeService {
  private familyMembers$ = new BehaviorSubject<FamilyMember[]>([]);
  private relationships$ = new BehaviorSubject<Relationship[]>([]);
  private selectedMember$ = new BehaviorSubject<FamilyMember | null>(null);

  constructor() {
    this.loadMockData();
  }

  getFamilyMembers(): Observable<FamilyMember[]> {
    return this.familyMembers$.asObservable();
  }

  getRelationships(): Observable<Relationship[]> {
    return this.relationships$.asObservable();
  }

  getSelectedMember(): Observable<FamilyMember | null> {
    return this.selectedMember$.asObservable();
  }

  getMemberById(id: string): FamilyMember | undefined {
    return this.familyMembers$.value.find((member) => member.id === id);
  }

  getRelationshipsForMember(memberId: string): RelationshipView[] {
    const relationships = this.relationships$.value.filter(
      (rel) => rel.sourceId === memberId || rel.targetId === memberId
    );

    return relationships
      .map((rel) => {
        const personId =
          rel.sourceId === memberId ? rel.targetId : rel.sourceId;
        const person = this.getMemberById(personId);

        // Определяем тип связи относительно текущего члена семьи
        let relationType = rel.type;
        if (rel.targetId === memberId) {
          // Инвертируем тип связи, если текущий член является целью
          relationType = this.invertRelationType(rel.type, rel.gender);
        }

        return {
          relationship: { ...rel, type: relationType },
          person: person!,
        };
      })
      .filter((rv) => rv.person !== undefined);
  }

  private invertRelationType(
    type: RelationshipType,
    personGender?: Gender
  ): RelationshipType {
    // Если связь симметричная (брат/сестра, супруги), возвращаем как есть
    if (
      type === RelationshipType.Spouse ||
      type === RelationshipType.ExSpouse
    ) {
      return type;
    }

    // Для братьев и сестер тип зависит от пола person
    if (type === RelationshipType.Brother || type === RelationshipType.Sister) {
      if (personGender) {
        return personGender === Gender.Male
          ? RelationshipType.Brother
          : RelationshipType.Sister;
      }
      return type; // Если пол неизвестен, оставляем как есть
    }

    // Инверсия родительских связей
    const inversionMap: {
      [key: string]: { male: RelationshipType; female: RelationshipType };
    } = {
      // Если исходная связь Father/Mother -> инвертируем в Son/Daughter в зависимости от пола
      [RelationshipType.Father]: {
        male: RelationshipType.Son,
        female: RelationshipType.Daughter,
      },
      [RelationshipType.Mother]: {
        male: RelationshipType.Son,
        female: RelationshipType.Daughter,
      },
      // Если исходная связь Son/Daughter -> инвертируем в Father/Mother в зависимости от пола
      [RelationshipType.Son]: {
        male: RelationshipType.Father,
        female: RelationshipType.Mother,
      },
      [RelationshipType.Daughter]: {
        male: RelationshipType.Father,
        female: RelationshipType.Mother,
      },
    };

    const inversion = inversionMap[type];
    if (inversion && personGender) {
      return personGender === Gender.Male ? inversion.male : inversion.female;
    }

    return type;
  }

  selectMember(member: FamilyMember): void {
    this.selectedMember$.next(member);
  }

  buildTreeStructure(rootId: string): TreeNode | null {
    // Находим самого старшего предка (корень дерева)
    const rootMember = this.findFamilyRoot(rootId);
    if (!rootMember) return null;

    // Строим дерево от корня
    const visited = new Set<string>();
    const tree = this.buildNodeRecursive(rootMember, visited);

    return tree;
  }

  private findFamilyRoot(startId: string): FamilyMember | null {
    const member = this.getMemberById(startId);
    if (!member) return null;

    // Находим всех предков рекурсивно
    const findAllAncestors = (
      memberId: string,
      visited: Set<string>
    ): string[] => {
      if (visited.has(memberId)) return [];
      visited.add(memberId);

      const ancestors: string[] = [memberId];

      // Находим родителей
      const parentRelations = this.relationships$.value.filter(
        (rel) =>
          rel.targetId === memberId &&
          (rel.type === RelationshipType.Son ||
            rel.type === RelationshipType.Daughter)
      );

      // Рекурсивно добавляем предков каждого родителя
      parentRelations.forEach((rel) => {
        ancestors.push(...findAllAncestors(rel.sourceId, visited));
      });

      return ancestors;
    };

    const allAncestors = findAllAncestors(startId, new Set());

    // Находим самого старшего по возрасту
    let oldestAncestor: FamilyMember | null = null;
    let oldestDate = new Date();

    allAncestors.forEach((ancestorId) => {
      const ancestor = this.getMemberById(ancestorId);
      if (ancestor && ancestor.birthDate) {
        const birthDate = new Date(ancestor.birthDate);
        if (!oldestAncestor || birthDate < oldestDate) {
          oldestDate = birthDate;
          oldestAncestor = ancestor;
        }
      }
    });

    return oldestAncestor || member;
  }

  private buildNodeRecursive(
    member: FamilyMember,
    visited: Set<string>,
    depth: number = 0
  ): TreeNode {
    if (visited.has(member.id)) {
      return { data: member, children: [] };
    }
    visited.add(member.id);

    const node: TreeNode = {
      data: member,
      children: [],
      parents: [],
    };

    const relationships = this.relationships$.value;

    // Найти супруга
    const spouseRel = relationships.find(
      (rel) =>
        (rel.sourceId === member.id || rel.targetId === member.id) &&
        rel.type === RelationshipType.Spouse
    );

    if (spouseRel) {
      const spouseId =
        spouseRel.sourceId === member.id
          ? spouseRel.targetId
          : spouseRel.sourceId;
      const spouse = this.getMemberById(spouseId);
      if (spouse && !visited.has(spouse.id)) {
        node.spouse = { data: spouse };
      }
    }

    // Найти всех детей (включая детей от супруга)
    const childrenIds = new Set<string>();

    // Дети текущего члена семьи
    relationships
      .filter(
        (rel) =>
          rel.sourceId === member.id &&
          (rel.type === RelationshipType.Son ||
            rel.type === RelationshipType.Daughter)
      )
      .forEach((rel) => childrenIds.add(rel.targetId));

    // Дети супруга (если есть)
    if (node.spouse) {
      relationships
        .filter(
          (rel) =>
            rel.sourceId === node.spouse!.data.id &&
            (rel.type === RelationshipType.Son ||
              rel.type === RelationshipType.Daughter)
        )
        .forEach((rel) => childrenIds.add(rel.targetId));
    }

    // Рекурсивно строим узлы для детей
    node.children = Array.from(childrenIds)
      .map((childId) => this.getMemberById(childId))
      .filter((child) => child !== undefined)
      .map((child) => this.buildNodeRecursive(child!, visited, depth + 1));

    // Найти родителей (только для отображения информации, не для построения дерева)
    const parentRels = relationships.filter(
      (rel) =>
        rel.targetId === member.id &&
        (rel.type === RelationshipType.Son ||
          rel.type === RelationshipType.Daughter)
    );

    node.parents = parentRels
      .map((rel) => this.getMemberById(rel.sourceId))
      .filter((parent) => parent !== undefined)
      .map((parent) => ({ data: parent! }));

    return node;
  }

  private loadMockData(): void {
    const members: FamilyMember[] = [
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
    ];

    const relationships: Relationship[] = [
      // Супружеские связи
      { id: 'r1', sourceId: '1', targetId: '2', type: RelationshipType.Spouse },
      { id: 'r2', sourceId: '3', targetId: '4', type: RelationshipType.Spouse },
      { id: 'r3', sourceId: '7', targetId: '8', type: RelationshipType.Spouse },
      {
        id: 'r16',
        sourceId: '10',
        targetId: '11',
        type: RelationshipType.Spouse,
      },

      // Дмитрий и Мария - родители детей
      {
        id: 'r4',
        sourceId: '1',
        targetId: '5',
        type: RelationshipType.Daughter,
        gender: Gender.Male,
      },
      {
        id: 'r5',
        sourceId: '2',
        targetId: '5',
        type: RelationshipType.Daughter,
        gender: Gender.Female,
      },
      {
        id: 'r6',
        sourceId: '1',
        targetId: '6',
        type: RelationshipType.Daughter,
        gender: Gender.Male,
      },
      {
        id: 'r7',
        sourceId: '2',
        targetId: '6',
        type: RelationshipType.Daughter,
        gender: Gender.Female,
      },

      // Александр и Ирина - родители Дмитрия
      {
        id: 'r8',
        sourceId: '3',
        targetId: '1',
        type: RelationshipType.Son,
        gender: Gender.Male,
      },
      {
        id: 'r9',
        sourceId: '4',
        targetId: '1',
        type: RelationshipType.Son,
        gender: Gender.Female,
      },

      // Александр и Ирина - родители Алёны (сестра Дмитрия?)
      {
        id: 'r10',
        sourceId: '3',
        targetId: '9',
        type: RelationshipType.Daughter,
        gender: Gender.Male,
      },
      {
        id: 'r11',
        sourceId: '4',
        targetId: '9',
        type: RelationshipType.Daughter,
        gender: Gender.Female,
      },

      // Николай и Валентина - родители Ирины
      {
        id: 'r12',
        sourceId: '7',
        targetId: '4',
        type: RelationshipType.Daughter,
        gender: Gender.Male,
      },
      {
        id: 'r13',
        sourceId: '8',
        targetId: '4',
        type: RelationshipType.Daughter,
        gender: Gender.Female,
      },

      // Василий и Зоя - родители Александра
      {
        id: 'r14',
        sourceId: '10',
        targetId: '3',
        type: RelationshipType.Son,
        gender: Gender.Male,
      },
      {
        id: 'r15',
        sourceId: '11',
        targetId: '3',
        type: RelationshipType.Son,
        gender: Gender.Female,
      },
    ];

    this.familyMembers$.next(members);
    this.relationships$.next(relationships);
    this.selectedMember$.next(members[4]);
  }
}
