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
import {
  addMember,
  addRelationship,
  deleteMember,
  mockMembers,
  mockRelationships,
  updateMember,
} from './mock-data';

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
    const rootMember = this.findFamilyRoot(rootId);
    if (!rootMember) return null;
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

    // Найти братьев и сестер
    const siblingIds = new Set<string>();

    // Ищем всех детей родителей текущего члена
    parentRels.forEach((parentRel) => {
      const parentId = parentRel.sourceId;

      // Находим всех детей этого родителя (кроме текущего члена)
      relationships
        .filter(
          (rel) =>
            rel.sourceId === parentId &&
            rel.targetId !== member.id &&
            (rel.type === RelationshipType.Son ||
              rel.type === RelationshipType.Daughter)
        )
        .forEach((rel) => siblingIds.add(rel.targetId));
    });

    node.siblings = Array.from(siblingIds)
      .map((siblingId) => this.getMemberById(siblingId))
      .filter((sibling) => sibling !== undefined && !visited.has(sibling!.id))
      .map((sibling) => this.buildNodeRecursive(sibling!, visited, depth));

    return node;
  }

  addFamilyMember(member: FamilyMember): string {
    const newId = this.generateId();
    const newMember = { ...member, id: newId };

    // Добавляем в mock data
    const newData = addMember(newMember);

    // Обновляем BehaviorSubject
    this.familyMembers$.next([...newData]);

    return newId;
  }

  addRelationship(
    sourceId: string,
    targetId: string,
    type: RelationshipType
  ): void {
    let newData;

    if (type === RelationshipType.Father || type === RelationshipType.Mother) {
      // Для родительских связей: новый член (targetId) становится родителем текущего (sourceId)
      const childId = sourceId; // текущий член — это ребёнок
      const parentId = targetId; // новый член — это родитель

      // Определяем тип связи по полу ребёнка
      const child = this.getMemberById(childId);
      let childType = RelationshipType.Daughter; // по умолчанию дочь

      if (child?.gender === Gender.Male) {
        childType = RelationshipType.Son;
      }

      const canonicalParentChild: Relationship = {
        id: this.generateRelationshipId(),
        sourceId: parentId, // родитель
        targetId: childId, // ребёнок
        type: childType, // Son или Daughter
      };

      newData = addRelationship(canonicalParentChild);
    } else {
      const newRelationship: Relationship = {
        id: this.generateRelationshipId(),
        sourceId,
        targetId,
        type,
      };
      newData = addRelationship(newRelationship);
    }

    // Обновляем BehaviorSubject
    this.relationships$.next([...newData]);
  }

  updateFamilyMember(member: FamilyMember): void {
    updateMember(member);
    this.familyMembers$.next([...mockMembers]);
  }

  deleteFamilyMember(memberId: string): void {
    deleteMember(memberId);
    this.familyMembers$.next([...mockMembers]);
    this.relationships$.next([...mockRelationships]);
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

        if (!person) return null;

        let relationType = rel.type;

        // Если текущий член является targetId, нужно инвертировать тип связи
        if (rel.targetId === memberId) {
          relationType = this.invertRelationType(rel.type, person.gender);
        }

        return {
          relationship: { ...rel, type: relationType },
          person: person,
        };
      })
      .filter((rv) => rv !== null) as RelationshipView[];
  }

  refreshData(): void {
    this.familyMembers$.next([...mockMembers]);
    this.relationships$.next([...mockRelationships]);
  }

  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `member_${timestamp}_${random}`;
  }

  private generateRelationshipId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `rel_${timestamp}_${random}`;
  }

  private loadMockData(): void {
    this.familyMembers$.next([...mockMembers]);
    this.relationships$.next([...mockRelationships]);
    const currentUser = mockMembers.find((m) => m.id === '1');
    if (currentUser) {
      this.selectedMember$.next(currentUser);
    }
  }
}
