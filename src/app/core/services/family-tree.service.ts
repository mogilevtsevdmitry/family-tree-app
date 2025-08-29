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
  deleteRelationship,
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

  // ... существующие геттеры остаются без изменений ...
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

  selectMember(member: FamilyMember): void {
    this.selectedMember$.next(member);
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

  updateFamilyMember(member: FamilyMember): void {
    updateMember(member);
    this.familyMembers$.next([...mockMembers]);
  }

  deleteFamilyMember(memberId: string): void {
    deleteMember(memberId);
    this.familyMembers$.next([...mockMembers]);
    this.relationships$.next([...mockRelationships]);
  }

  refreshData(): void {
    this.familyMembers$.next([...mockMembers]);
    this.relationships$.next([...mockRelationships]);
  }

  private findSiblings(memberId: string): FamilyMember[] {
    const siblings: FamilyMember[] = [];
    const siblingIds = new Set<string>();

    // Находим родителей
    const parentRelations = this.relationships$.value.filter(
      (rel) =>
        rel.targetId === memberId &&
        (rel.type === RelationshipType.Son ||
          rel.type === RelationshipType.Daughter)
    );

    // Для каждого родителя находим всех его детей
    parentRelations.forEach((parentRel) => {
      const parentId = parentRel.sourceId;

      this.relationships$.value
        .filter(
          (rel) =>
            rel.sourceId === parentId &&
            rel.targetId !== memberId &&
            (rel.type === RelationshipType.Son ||
              rel.type === RelationshipType.Daughter)
        )
        .forEach((rel) => siblingIds.add(rel.targetId));
    });

    // Преобразуем ID в объекты FamilyMember
    siblingIds.forEach((id) => {
      const sibling = this.getMemberById(id);
      if (sibling) {
        siblings.push(sibling);
      }
    });

    return siblings;
  }

  buildTreeStructure(rootId: string): TreeNode | null {
    // Находим корень дерева (самого старшего предка)
    const rootMember = this.findFamilyRoot(rootId);
    if (!rootMember) return null;

    // Собираем всех членов семьи, связанных с корнем
    const familyNetwork = this.buildFamilyNetwork(rootMember.id);

    // Строим дерево от корня
    const visited = new Set<string>();
    let tree = this.buildNodeRecursive(rootMember, visited, 0, familyNetwork);

    // Добавляем братьев/сестер на корневом уровне, если они есть
    tree = this.includeSiblingsAtRoot(tree, visited, familyNetwork);
    // Находим всех членов семьи без родителей (верхний уровень)
    const topLevelAncestors = Array.from(familyNetwork)
      .map((id) => this.getMemberById(id))
      .filter((m): m is FamilyMember => !!m)
      .filter(
        (m) =>
          !this.relationships$.value.some(
            (rel) =>
              rel.targetId === m.id &&
              (rel.type === RelationshipType.Son ||
                rel.type === RelationshipType.Daughter)
          )
      );

    // Добавляем остальных верхнеуровневых предков как отдельные поддеревья
    const additionalRoots: TreeNode[] = [];
    topLevelAncestors.forEach((ancestor) => {
      if (ancestor.id !== rootMember.id) {
        const subtree = this.buildNodeRecursive(
          ancestor,
          new Set<string>(),
          0,
          familyNetwork
        );
        additionalRoots.push(subtree);
      }
    });

    if (additionalRoots.length > 0) {
      (tree as any).siblings = [
        ...((tree as any).siblings || []),
        ...additionalRoots,
      ];
    }

    return tree;
  }

  private buildFamilyNetwork(startId: string): Set<string> {
    const network = new Set<string>();
    const toProcess = [startId];

    while (toProcess.length > 0) {
      const currentId = toProcess.pop()!;
      if (network.has(currentId)) continue;
      network.add(currentId);

      // Находим все связи для текущего члена
      const relationships = this.relationships$.value.filter(
        (rel) => rel.sourceId === currentId || rel.targetId === currentId
      );

      // Добавляем всех связанных людей в очередь обработки
      relationships.forEach((rel) => {
        const relatedId =
          rel.sourceId === currentId ? rel.targetId : rel.sourceId;
        if (!network.has(relatedId)) {
          toProcess.push(relatedId);
        }
      });
    }

    return network;
  }

  private findFamilyRoot(startId: string): FamilyMember | null {
    const member = this.getMemberById(startId);
    if (!member) return null;

    // Используем BFS (поиск в ширину) для поиска всех связанных членов семьи
    const visited = new Set<string>();
    const queue: { id: string; level: number }[] = [{ id: startId, level: 0 }];
    const memberLevels = new Map<string, number>();

    while (queue.length > 0) {
      const { id: currentId, level } = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentMember = this.getMemberById(currentId);
      if (!currentMember) continue;

      // Сохраняем уровень члена семьи (чем меньше, тем старше поколение)
      const existingLevel = memberLevels.get(currentId);
      if (existingLevel === undefined || level < existingLevel) {
        memberLevels.set(currentId, level);
      }

      const relationships = this.relationships$.value;

      // 1. Находим родителей (они на уровень выше)
      const parentRelations = relationships.filter(
        (rel) =>
          rel.targetId === currentId &&
          (rel.type === RelationshipType.Son ||
            rel.type === RelationshipType.Daughter)
      );

      parentRelations.forEach((rel) => {
        if (!visited.has(rel.sourceId)) {
          queue.push({ id: rel.sourceId, level: level - 1 });
        }
      });

      // 2. Находим детей (они на уровень ниже)
      const childRelations = relationships.filter(
        (rel) =>
          rel.sourceId === currentId &&
          (rel.type === RelationshipType.Son ||
            rel.type === RelationshipType.Daughter)
      );

      childRelations.forEach((rel) => {
        if (!visited.has(rel.targetId)) {
          queue.push({ id: rel.targetId, level: level + 1 });
        }
      });

      // 3. Находим супругов (они на том же уровне)
      const spouseRelations = relationships.filter(
        (rel) =>
          (rel.sourceId === currentId || rel.targetId === currentId) &&
          (rel.type === RelationshipType.Spouse ||
            rel.type === RelationshipType.ExSpouse)
      );

      spouseRelations.forEach((rel) => {
        const spouseId =
          rel.sourceId === currentId ? rel.targetId : rel.sourceId;
        if (!visited.has(spouseId)) {
          queue.push({ id: spouseId, level: level });

          // ВАЖНО: Также проверяем родителей супруга!
          // Они тоже должны быть включены в дерево на уровень выше
          const spouseParentRelations = relationships.filter(
            (r) =>
              r.targetId === spouseId &&
              (r.type === RelationshipType.Son ||
                r.type === RelationshipType.Daughter)
          );

          spouseParentRelations.forEach((parentRel) => {
            if (!visited.has(parentRel.sourceId)) {
              queue.push({ id: parentRel.sourceId, level: level - 1 });
            }
          });
        }
      });

      // 4. Находим братьев/сестер (они на том же уровне)
      const siblingRelations = relationships.filter(
        (rel) =>
          (rel.sourceId === currentId &&
            (rel.type === RelationshipType.Brother ||
              rel.type === RelationshipType.Sister)) ||
          (rel.targetId === currentId &&
            (rel.type === RelationshipType.Brother ||
              rel.type === RelationshipType.Sister))
      );

      siblingRelations.forEach((rel) => {
        const siblingId =
          rel.sourceId === currentId ? rel.targetId : rel.sourceId;
        if (!visited.has(siblingId)) {
          queue.push({ id: siblingId, level: level });
        }
      });
    }

    // Находим члена семьи с минимальным уровнем (самый старший)
    let rootMember: FamilyMember | null = null;
    let minLevel = Infinity;
    let oldestBirthDate = new Date();

    memberLevels.forEach((level, memberId) => {
      const member = this.getMemberById(memberId);
      if (member) {
        // Приоритет: сначала по уровню, потом по возрасту
        const birthDate = member.birthDate
          ? new Date(member.birthDate)
          : new Date();

        if (
          level < minLevel ||
          (level === minLevel && birthDate < oldestBirthDate)
        ) {
          minLevel = level;
          oldestBirthDate = birthDate;
          rootMember = member;
        }
      }
    });

    console.log(
      'Found root:',
      // @ts-ignore
      rootMember?.firstName,
      // @ts-ignore
      rootMember?.lastName,
      'Level:',
      minLevel
    );
    console.log(
      'All levels:',
      Array.from(memberLevels.entries()).map(([id, level]) => {
        const m = this.getMemberById(id);
        return `${m?.firstName} ${m?.lastName}: ${level}`;
      })
    );

    return rootMember || member;
  }

  private includeSiblingsAtRoot(
    root: TreeNode,
    visited: Set<string>,
    familyNetwork: Set<string>
  ): TreeNode {
    const rootMember = root.data;
    const relationships = this.relationships$.value;

    // Отладочная информация убрана

    // Находим прямые связи братьев/сестер для корня
    const siblingRelations = relationships.filter(
      (rel) =>
        (rel.sourceId === rootMember.id &&
          (rel.type === RelationshipType.Brother ||
            rel.type === RelationshipType.Sister)) ||
        (rel.targetId === rootMember.id &&
          (rel.type === RelationshipType.Brother ||
            rel.type === RelationshipType.Sister))
    );

    // Отладочная информация убрана

    // Если у корня есть братья/сестры
    if (siblingRelations.length > 0) {
      const siblings: TreeNode[] = [];

      siblingRelations.forEach((rel) => {
        const siblingId =
          rel.sourceId === rootMember.id ? rel.targetId : rel.sourceId;

        if (!visited.has(siblingId) && familyNetwork.has(siblingId)) {
          const sibling = this.getMemberById(siblingId);
          if (sibling) {
            // Рекурсивно строим поддерево для брата/сестры
            const siblingNode = this.buildNodeRecursive(
              sibling,
              visited,
              0,
              familyNetwork
            );
            siblings.push(siblingNode);
          }
        }
      });

      // Добавляем братьев/сестер к корню в любом случае
      if (siblings.length > 0) {
        (root as any).siblings = siblings;
      }
    }
    return root;
  }

  private buildNodeRecursive(
    member: FamilyMember,
    visited: Set<string>,
    depth: number = 0,
    familyNetwork?: Set<string>
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

    // Найти супруга и отметить как посещенного
    const spouseRel = relationships.find(
      (rel) =>
        (rel.sourceId === member.id || rel.targetId === member.id) &&
        (rel.type === RelationshipType.Spouse ||
          rel.type === RelationshipType.ExSpouse)
    );

    if (spouseRel) {
      const spouseId =
        spouseRel.sourceId === member.id
          ? spouseRel.targetId
          : spouseRel.sourceId;
      const spouse = this.getMemberById(spouseId);
      if (spouse && !visited.has(spouse.id)) {
        node.spouse = { data: spouse };
        visited.add(spouse.id);

        // ВАЖНО: Также обрабатываем детей супруга
        // Это нужно для случаев, когда у супруга есть дети от других отношений
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
      .map((child) =>
        this.buildNodeRecursive(child!, visited, depth + 1, familyNetwork)
      );

    // Найти родителей (только для отображения информации, не для построения дерева вверх)
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

  private invertRelationType(
    type: RelationshipType,
    personGender?: Gender
  ): RelationshipType {
    if (
      type === RelationshipType.Spouse ||
      type === RelationshipType.ExSpouse
    ) {
      return type;
    }

    if (type === RelationshipType.Brother || type === RelationshipType.Sister) {
      if (personGender) {
        return personGender === Gender.Male
          ? RelationshipType.Brother
          : RelationshipType.Sister;
      }
      return type;
    }

    const inversionMap: {
      [key: string]: { male: RelationshipType; female: RelationshipType };
    } = {
      [RelationshipType.Father]: {
        male: RelationshipType.Son,
        female: RelationshipType.Daughter,
      },
      [RelationshipType.Mother]: {
        male: RelationshipType.Son,
        female: RelationshipType.Daughter,
      },
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

  deleteRelationship(relationshipId: string): void {
    // Если это виртуальная связь (для братьев/сестер), пропускаем
    if (relationshipId.startsWith('virtual_')) {
      // Для виртуальных связей нужно удалить реальные связи с родителями
      // virtual_memberId_siblingId
      const [, memberId, siblingId] = relationshipId.split('_');

      // Находим и удаляем связи брата/сестры с родителями текущего члена
      const parentRelations = this.relationships$.value.filter(
        (rel) =>
          rel.targetId === memberId &&
          (rel.type === RelationshipType.Son ||
            rel.type === RelationshipType.Daughter)
      );

      // Удаляем связи sibling с теми же родителями
      const toDelete = this.relationships$.value.filter(
        (rel) =>
          parentRelations.some((pr) => pr.sourceId === rel.sourceId) &&
          rel.targetId === siblingId &&
          (rel.type === RelationshipType.Son ||
            rel.type === RelationshipType.Daughter)
      );

      toDelete.forEach((rel) => {
        deleteRelationship(rel.id);
      });
    } else {
      // Удаляем реальную связь
      const relationship = this.relationships$.value.find(
        (r) => r.id === relationshipId
      );

      if (relationship) {
        // Если это связь родитель-ребенок, удаляем обе стороны
        if (
          [
            RelationshipType.Father,
            RelationshipType.Mother,
            RelationshipType.Son,
            RelationshipType.Daughter,
          ].includes(relationship.type)
        ) {
          // Удаляем все связи между этими двумя людьми
          const toDelete = this.relationships$.value.filter(
            (rel) =>
              (rel.sourceId === relationship.sourceId &&
                rel.targetId === relationship.targetId) ||
              (rel.sourceId === relationship.targetId &&
                rel.targetId === relationship.sourceId)
          );

          toDelete.forEach((rel) => {
            deleteRelationship(rel.id);
          });
        } else {
          // Для других типов связей удаляем только указанную
          deleteRelationship(relationshipId);
        }
      }
    }

    this.relationships$.next([...mockRelationships]);
    this.refreshData();
  }

  addRelationship(
    sourceId: string,
    targetId: string,
    type: RelationshipType
  ): void {
    let newData;

    // Обрабатываем различные типы связей
    switch (type) {
      case RelationshipType.Father:
      case RelationshipType.Mother: {
        // Для родительских связей: targetId - это родитель, sourceId - ребенок
        const childId = sourceId;
        const parentId = targetId;
        const child = this.getMemberById(childId);

        const childType =
          child?.gender === Gender.Male
            ? RelationshipType.Son
            : RelationshipType.Daughter;

        const parentChildRelation: Relationship = {
          id: this.generateRelationshipId(),
          sourceId: parentId, // родитель источник
          targetId: childId, // ребенок цель
          type: childType,
        };

        newData = addRelationship(parentChildRelation);
        break;
      }

      case RelationshipType.Son:
      case RelationshipType.Daughter: {
        // Прямая связь от родителя к ребенку
        const directRelation: Relationship = {
          id: this.generateRelationshipId(),
          sourceId: sourceId, // родитель
          targetId: targetId, // ребенок
          type: type,
        };

        newData = addRelationship(directRelation);
        break;
      }

      case RelationshipType.Brother:
      case RelationshipType.Sister: {
        // Для братьев/сестер есть два варианта:
        const currentMember = this.getMemberById(sourceId);
        const siblingMember = this.getMemberById(targetId);

        if (currentMember && siblingMember) {
          // 1. Находим родителей текущего члена семьи
          const parentRelations = this.relationships$.value.filter(
            (rel) =>
              rel.targetId === sourceId &&
              (rel.type === RelationshipType.Son ||
                rel.type === RelationshipType.Daughter)
          );

          if (parentRelations.length > 0) {
            // Если есть родители - добавляем нового брата/сестру как их ребенка
            parentRelations.forEach((parentRel) => {
              const siblingType =
                siblingMember.gender === Gender.Male
                  ? RelationshipType.Son
                  : RelationshipType.Daughter;

              const newSiblingRelation: Relationship = {
                id: this.generateRelationshipId(),
                sourceId: parentRel.sourceId, // тот же родитель
                targetId: targetId, // новый брат/сестра
                type: siblingType,
              };

              addRelationship(newSiblingRelation);
            });
          } else {
            // 2. Если родителей нет, создаем виртуальных родителей или прямую связь
            // Опция А: Создаем фиктивных родителей (не реализовано)
            // Опция Б: Создаем взаимную связь брат-сестра

            // Создаем связь от source к target
            const sourceToTargetRelation: Relationship = {
              id: this.generateRelationshipId(),
              sourceId: sourceId,
              targetId: targetId,
              type:
                siblingMember.gender === Gender.Male
                  ? RelationshipType.Brother
                  : RelationshipType.Sister,
            };
            addRelationship(sourceToTargetRelation);

            // Создаем обратную связь от target к source
            const targetToSourceRelation: Relationship = {
              id: this.generateRelationshipId(),
              sourceId: targetId,
              targetId: sourceId,
              type:
                currentMember.gender === Gender.Male
                  ? RelationshipType.Brother
                  : RelationshipType.Sister,
            };
            addRelationship(targetToSourceRelation);
          }
        }

        newData = [...mockRelationships];
        break;
      }

      case RelationshipType.Spouse:
      case RelationshipType.ExSpouse: {
        // Супружеская связь - двусторонняя
        const spouseRelation: Relationship = {
          id: this.generateRelationshipId(),
          sourceId: sourceId,
          targetId: targetId,
          type: type,
        };

        newData = addRelationship(spouseRelation);
        break;
      }

      default: {
        // Для любых других типов создаем прямую связь
        const defaultRelation: Relationship = {
          id: this.generateRelationshipId(),
          sourceId: sourceId,
          targetId: targetId,
          type: type,
        };

        newData = addRelationship(defaultRelation);
      }
    }

    // Обновляем BehaviorSubject и обновляем дерево
    this.relationships$.next([...mockRelationships]);
    this.refreshData();
  }

  // Также нужно обновить метод getRelationshipsForMember чтобы он правильно показывал прямые связи брат/сестра:

  getRelationshipsForMember(memberId: string): RelationshipView[] {
    const relationships = this.relationships$.value.filter(
      (rel) => rel.sourceId === memberId || rel.targetId === memberId
    );

    // Находим братьев и сестер через общих родителей
    const siblingsViaParents = this.findSiblings(memberId);

    // Создаем Set для отслеживания уже добавленных связей
    const addedRelationships = new Set<string>();

    const allRelationships: Relationship[] = [];

    // Добавляем существующие связи
    relationships.forEach((rel) => {
      const key = `${rel.sourceId}-${rel.targetId}-${rel.type}`;
      if (!addedRelationships.has(key)) {
        allRelationships.push(rel);
        addedRelationships.add(key);
      }
    });

    // Добавляем виртуальные связи для братьев/сестер найденных через родителей
    siblingsViaParents.forEach((sibling) => {
      const siblingType =
        sibling.gender === Gender.Male
          ? RelationshipType.Brother
          : RelationshipType.Sister;

      // Проверяем, что связь еще не существует
      const exists = allRelationships.some(
        (rel) =>
          (rel.sourceId === memberId && rel.targetId === sibling.id) ||
          (rel.targetId === memberId && rel.sourceId === sibling.id)
      );

      if (!exists) {
        const virtualKey = `${memberId}-${sibling.id}-${siblingType}`;
        if (!addedRelationships.has(virtualKey)) {
          allRelationships.push({
            id: `virtual_${memberId}_${sibling.id}`,
            sourceId: memberId,
            targetId: sibling.id,
            type: siblingType,
          });
          addedRelationships.add(virtualKey);
        }
      }
    });

    return allRelationships
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
}
