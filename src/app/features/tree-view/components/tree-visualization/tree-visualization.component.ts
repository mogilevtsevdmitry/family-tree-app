// src/app/features/tree-view/components/tree-visualization/tree-visualization.component.ts

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../../shared/material/material-imports';
import { FamilyTreeService } from '../../../../core/services/family-tree.service';
import { UserService } from '../../../../core/services/user.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { TreeNode } from '../../../../core/models/tree-node.model';
import { FamilyMember } from '../../../../core/models/family-member.model';
import { AddMemberDialogComponent } from '../../../profile/components/add-member-dialog/add-member-dialog.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { RelationshipType } from '../../../../core/models/relationship.model';

@Component({
  selector: 'app-tree-visualization',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ...MATERIAL_IMPORTS],
  template: `
    <div class="tree-visualization">
      <div #treeContainer class="tree-container"></div>
    </div>
  `,
  styles: [
    `
      .tree-visualization {
        width: 100%;
        height: 100%;
        position: relative;

        .tree-container {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      }

      :host ::ng-deep {
        .node-group {
          &:hover {
            .node-circle {
              stroke-width: 3px !important;
              filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.4));
            }

            .add-member-btn {
              opacity: 1 !important;
              pointer-events: all !important;
            }
          }
        }

        .node-circle {
          transition: stroke-width 0.2s ease, filter 0.2s ease;
        }

        .node-current .node-circle {
          stroke: #ffd700 !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
        }

        .link {
          opacity: 0.7;
          fill: none;
          stroke: rgba(255, 255, 255, 0.6);
          stroke-width: 2px;
        }

        .link-spouse {
          stroke: #ff69b4;
          stroke-dasharray: 5, 5;
          opacity: 0.8;
        }

        .add-member-btn {
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;

          &.mobile {
            opacity: 0.9;
            pointer-events: all;
          }

          .fab-button {
            fill: #4caf50;
            filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
            transition: fill 0.2s ease, filter 0.2s ease;
          }

          &:hover .fab-button {
            fill: #66bb6a;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
          }

          &:active .fab-button {
            fill: #43a047;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          }

          .fab-icon {
            fill: white;
            font-size: 22px;
            font-weight: 300;
            pointer-events: none;
          }
        }

        .node-text {
          fill: white;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
          pointer-events: none;
          user-select: none;
        }

        .node-name {
          font-weight: 600;
          font-size: 13px;
        }

        .node-lastname {
          font-size: 11px;
          opacity: 0.95;
        }

        .node-year {
          font-size: 10px;
          opacity: 0.85;
        }

        .node-gender {
          font-size: 18px;
          opacity: 0.9;
        }
      }
    `,
  ],
})
export class TreeVisualizationComponent implements OnInit, OnDestroy {
  @ViewChild('treeContainer', { static: true }) treeContainer!: ElementRef;

  private svg: any;
  private g: any;
  private zoom: any;
  private tree: any;
  private root: TreeNode | null = null;
  private currentUserId: string | null = null;
  private destroy$ = new Subject<void>();
  private isMobile = false;

  width = 0;
  height = 0;
  nodeRadius = 35;
  nodeSpacing = { x: 180, y: 240 }; // Увеличен вертикальный отступ для кнопки

  constructor(
    private familyTreeService: FamilyTreeService,
    private userService: UserService,
    private navigationService: NavigationService,
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
    this.initializeDimensions();
    this.initializeSvg();
    this.loadTreeData();

    // Подписка на изменения данных
    this.familyTreeService
      .getFamilyMembers()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshTree();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshTree(): void {
    if (this.currentUserId) {
      this.root = this.familyTreeService.buildTreeStructure(this.currentUserId);
      if (this.root) {
        this.renderTree();
      }
    }
  }

  private initializeDimensions(): void {
    const element = this.treeContainer.nativeElement;
    this.width = element.offsetWidth;
    this.height = element.offsetHeight;
  }

  private initializeSvg(): void {
    this.svg = d3
      .select(this.treeContainer.nativeElement)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    // Добавляем определения для фильтров
    const defs = this.svg.append('defs');

    // Фильтр для теней
    const filter = defs
      .append('filter')
      .attr('id', 'dropshadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter
      .append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 3);

    filter
      .append('feOffset')
      .attr('dx', 0)
      .attr('dy', 2)
      .attr('result', 'offsetblur');

    filter
      .append('feComponentTransfer')
      .append('feFuncA')
      .attr('type', 'linear')
      .attr('slope', 0.3);

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    this.g = this.svg.append('g');

    // Настройка зума
    this.zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // Создание tree layout
    this.tree = d3
      .tree<TreeNode>()
      .size([this.width, this.height])
      .nodeSize([this.nodeSpacing.x, this.nodeSpacing.y])
      .separation((a, b) => {
        if (a.data.spouse || b.data.spouse) return 2;
        return a.parent === b.parent ? 1 : 1.5;
      });
  }

  private loadTreeData(): void {
    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.currentUserId = user.id;
          this.root = this.familyTreeService.buildTreeStructure(user.id);
          if (this.root) {
            this.renderTree();
            setTimeout(() => this.centerOnCurrentUser(), 100);
          }
        }
      });
  }

  private renderTree(): void {
    if (!this.root) return;

    // Очистка предыдущего дерева
    this.g.selectAll('*').remove();

    // Создание группы для связей
    const linkGroup = this.g.append('g').attr('class', 'links');

    // Создание группы для узлов
    const nodeGroup = this.g.append('g').attr('class', 'nodes');

    // Создание иерархии d3
    const hierarchy = d3.hierarchy(this.root, (d: TreeNode) => d.children);
    const treeData = this.tree(hierarchy);

    // Получаем все узлы
    const nodes = treeData.descendants();

    // Корректируем позиции для супругов
    nodes.forEach((node: any) => {
      if (node.data.spouse) {
        node.data.spouse.x = node.x + this.nodeSpacing.x / 2;
        node.data.spouse.y = node.y;
      }
    });

    // Создание связей родитель-ребенок
    const links = treeData.links();

    // Кэшируем позиции родителей для оптимизации
    const parentPositionsCache = new Map<string, { x: number; y: number }>();

    // Предварительно вычисляем позиции для всех родителей
    nodes.forEach((node: any) => {
      if (node.data.parents && node.data.parents.length > 1) {
        const parentNodes = nodes.filter((n: any) =>
          node.data.parents.some((parent: any) => {
            // Проверяем структуру parent
            if (!parent || !parent.data) return false;
            // parent может быть либо TreeNode, либо иметь структуру { data: FamilyMember }
            const parentId =
              parent.data.id || (parent.data.data && parent.data.data.id);
            const nodeId = n.data.data.id;
            return parentId === nodeId;
          })
        );

        if (parentNodes.length > 1) {
          parentNodes.sort((a: any, b: any) => a.x - b.x);
          const firstParent = parentNodes[0];
          const lastParent = parentNodes[parentNodes.length - 1];
          const centerX = (firstParent.x + lastParent.x) / 2;
          const centerY = node.y - this.nodeRadius;
          const deltaX = centerX - node.x;
          this.shiftSubtree(node, deltaX);
          parentPositionsCache.set(node.data.data.id, {
            x: centerX,
            y: centerY,
          });
        }
      }
    });

    // Создание дополнительных связей для всех отношений, которые не покрываются d3.hierarchy
    const additionalLinks: any[] = [];

    // Проходим по всем узлам и создаем недостающие связи
    nodes.forEach((node: any) => {
      // Добавляем связи родитель-ребенок, если они отсутствуют в d3.hierarchy
      if (node.data.parents && node.data.parents.length > 0) {
        node.data.parents.forEach((parent: any) => {
          // Проверяем структуру parent
          if (!parent || !parent.data) return;

          // Получаем ID родителя с учетом возможных структур
          const parentId =
            parent.data.id || (parent.data.data && parent.data.data.id);
          if (!parentId) return;

          // Проверяем, есть ли уже такая связь в d3.hierarchy
          const existingLink = links.find(
            (link: any) =>
              link.source.data.data.id === parentId &&
              link.target.data.data.id === node.data.data.id
          );

          if (!existingLink) {
            // Создаем дополнительную связь
            const parentPosition = this.findNodePosition(parentId, nodes);
            if (parentPosition) {
              additionalLinks.push({
                source: {
                  data: parent,
                  x: parentPosition.x,
                  y: parentPosition.y,
                },
                target: {
                  data: node.data,
                  x: node.x,
                  y: node.y,
                },
              });
            }
          }
        });
      }
    });

    // Дополнительно создаем связи для всех отношений из mock-data, которые не покрываются d3.hierarchy
    // Это нужно для случаев, когда родители находятся на более высоком уровне дерева
    const allMemberIds = new Set(nodes.map((n: any) => n.data.data.id));

    // Получаем все связи из сервиса синхронно
    const relationships =
      (this.familyTreeService as any).relationships$.value || [];

    console.log('=== DEBUG INFO ===');
    console.log('All member IDs in tree:', Array.from(allMemberIds));
    console.log('All relationships from service:', relationships);
    console.log('Standard links from d3:', links);

    relationships.forEach((rel: any) => {
      // Проверяем, есть ли связь родитель-ребенок
      if (
        rel.type === RelationshipType.Son ||
        rel.type === RelationshipType.Daughter
      ) {
        const parentId = rel.sourceId;
        const childId = rel.targetId;

        console.log(
          `Processing relationship: ${parentId} -> ${childId} (${rel.type})`
        );

        // Проверяем, есть ли оба узла в дереве
        if (allMemberIds.has(parentId) && allMemberIds.has(childId)) {
          console.log(`Both nodes exist in tree: ${parentId} and ${childId}`);

          // Проверяем, есть ли уже такая связь
          const existingLink = links.find(
            (link: any) =>
              link.source.data.data.id === parentId &&
              link.target.data.data.id === childId
          );

          const existingAdditionalLink = additionalLinks.find(
            (link: any) =>
              link.source.data.data.id === parentId &&
              link.target.data.data.id === childId
          );

          console.log(`Existing link in d3:`, existingLink);
          console.log(`Existing link in additional:`, existingAdditionalLink);

          if (!existingLink && !existingAdditionalLink) {
            console.log(`Creating new link: ${parentId} -> ${childId}`);

            // Создаем дополнительную связь
            const parentPosition = this.findNodePosition(parentId, nodes);
            const childPosition = this.findNodePosition(childId, nodes);

            console.log(`Parent position:`, parentPosition);
            console.log(`Child position:`, childPosition);

            if (parentPosition && childPosition) {
              additionalLinks.push({
                source: {
                  data: { data: { id: parentId } }, // Упрощенная структура
                  x: parentPosition.x,
                  y: parentPosition.y,
                },
                target: {
                  data: { data: { id: childId } }, // Упрощенная структура
                  x: childPosition.x,
                  y: childPosition.y,
                },
              });
              console.log(`Link added to additionalLinks`);
            }
          }
        } else {
          console.log(
            `Missing nodes: parentId=${parentId} (${allMemberIds.has(
              parentId
            )}), childId=${childId} (${allMemberIds.has(childId)})`
          );
        }
      }
    });

    console.log('Additional links created:', additionalLinks);
    console.log('=== END DEBUG INFO ===');

    // Объединяем стандартные и дополнительные связи
    const allLinks = [...links, ...additionalLinks];

    // Рисование всех связей с учетом позиционирования родителей
    // Если у ребенка есть несколько родителей (супруги или разведенные),
    // то линия связи выходит из центра между ними
    linkGroup
      .selectAll('.link')
      .data(allLinks)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        // Проверяем существование данных
        if (!d.source || !d.target || !d.source.data || !d.target.data) {
          return '';
        }

        const sourceY = d.source.y + this.nodeRadius;
        const targetY = d.target.y - this.nodeRadius;

        // Определяем начальную точку связи
        let sourceX = d.source.x;
        let sourceYPos = sourceY;

        // Случай 1: Если у родителя есть супруг, линия выходит из центра между ними
        if (d.source.data.spouse) {
          const spouseX = d.source.x + this.nodeSpacing.x / 2;
          sourceX = (d.source.x + spouseX) / 2; // центр между родителями
          sourceYPos = sourceY;
        }

        // Случай 2: Если у ребенка есть несколько родителей (например, разведенные)
        // используем кэшированную позицию центра
        if (d.target.data.data && d.target.data.data.id) {
          const cachedPosition = parentPositionsCache.get(
            d.target.data.data.id
          );
          if (cachedPosition) {
            sourceX = cachedPosition.x;
            sourceYPos = cachedPosition.y;
          }
        }

        // Строим кривую Безье от начальной точки к ребенку
        return `M${sourceX},${sourceYPos}
                C${sourceX},${(sourceYPos + targetY) / 2}
                 ${d.target.x},${(sourceYPos + targetY) / 2}
                 ${d.target.x},${targetY}`;
      });

    // Рисование связей между супругами
    nodes.forEach((node: any) => {
      if (node.data.spouse) {
        linkGroup
          .append('line')
          .attr('class', 'link link-spouse')
          .attr('x1', node.x + this.nodeRadius)
          .attr('y1', node.y)
          .attr('x2', node.data.spouse.x - this.nodeRadius)
          .attr('y2', node.data.spouse.y);
      }
    });

    // Создание групп для узлов
    const nodeSelection = nodeGroup
      .selectAll('.node-group')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', (d: any) => {
        let classes = 'node-group';
        if (d.data.data.id === this.currentUserId) {
          classes += ' node-current';
        }
        return classes;
      })
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    // Невидимая зона наведения, чтобы не терять hover между узлом и кнопкой
    nodeSelection
      .append('rect')
      .attr('class', 'hover-area')
      .attr('x', -this.nodeRadius)
      .attr('y', -this.nodeRadius)
      .attr('width', this.nodeRadius * 2)
      .attr('height', this.nodeRadius * 2 + 74)
      .attr('fill', 'transparent')
      .on('click', (event: any, d: any) => this.onNodeClick(d.data.data));

    // Добавление кругов для узлов
    nodeSelection
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', this.nodeRadius)
      .style('fill', (d: any) => this.getNodeColor(d.data.data))
      .style('stroke', 'white')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('filter', 'url(#dropshadow)')
      .on('click', (event: any, d: any) => this.onNodeClick(d.data.data));

    // Добавление иконки пола
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-gender')
      .attr('dy', '-8')
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        if (d.data.data.gender === 'male') return '♂';
        if (d.data.data.gender === 'female') return '♀';
        return '⚥';
      });

    // Добавление имени
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-name')
      .attr('dy', '6')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.data.firstName);

    // Добавление фамилии под узлом
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-lastname')
      .attr('dy', this.nodeRadius + 20)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.data.lastName);

    // Добавление года рождения
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-year')
      .attr('dy', this.nodeRadius + 35)
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        if (d.data.data.birthDate) {
          const year = new Date(d.data.data.birthDate).getFullYear();
          if (d.data.data.deathDate) {
            const deathYear = new Date(d.data.data.deathDate).getFullYear();
            return `${year} - ${deathYear}`;
          }
          return year;
        }
        return '';
      });

    // Добавление кнопки "Добавить члена семьи" СНИЗУ от узла
    const addButtonGroup = nodeSelection
      .append('g')
      .attr('class', `add-member-btn ${this.isMobile ? 'mobile' : ''}`)
      .attr('transform', `translate(0, ${this.nodeRadius + 60})`) // Позиция четко под узлом
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        this.openAddMemberDialog(d.data.data);
      });

    // Основной круг кнопки
    addButtonGroup
      .append('circle')
      .attr('class', 'fab-button')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 14);

    // Иконка плюса
    addButtonGroup
      .append('text')
      .attr('class', 'fab-icon')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .text('+');

    // Рисование узлов супругов
    nodes.forEach((node: any) => {
      if (node.data.spouse) {
        const spouseGroup = nodeGroup
          .append('g')
          .attr('class', 'node-group')
          .attr(
            'transform',
            `translate(${node.data.spouse.x},${node.data.spouse.y})`
          );

        // Зона наведения для супруга
        spouseGroup
          .append('rect')
          .attr('class', 'hover-area')
          .attr('x', -this.nodeRadius)
          .attr('y', -this.nodeRadius)
          .attr('width', this.nodeRadius * 2)
          .attr('height', this.nodeRadius * 2 + 74)
          .attr('fill', 'transparent')
          .on('click', () => this.onNodeClick(node.data.spouse.data));

        spouseGroup
          .append('circle')
          .attr('class', 'node-circle')
          .attr('r', this.nodeRadius)
          .style('fill', this.getNodeColor(node.data.spouse.data))
          .style('stroke', 'white')
          .style('stroke-width', 2)
          .style('cursor', 'pointer')
          .style('filter', 'url(#dropshadow)')
          .on('click', () => this.onNodeClick(node.data.spouse.data));

        spouseGroup
          .append('text')
          .attr('class', 'node-text node-gender')
          .attr('dy', '-8')
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.gender === 'male' ? '♂' : '♀');

        spouseGroup
          .append('text')
          .attr('class', 'node-text node-name')
          .attr('dy', '6')
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.firstName);

        spouseGroup
          .append('text')
          .attr('class', 'node-text node-lastname')
          .attr('dy', this.nodeRadius + 20)
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.lastName);

        if (node.data.spouse.data.birthDate) {
          const birthYear = new Date(
            node.data.spouse.data.birthDate
          ).getFullYear();
          let yearText = birthYear.toString();

          if (node.data.spouse.data.deathDate) {
            const deathYear = new Date(
              node.data.spouse.data.deathDate
            ).getFullYear();
            yearText = `${birthYear} - ${deathYear}`;
          }

          spouseGroup
            .append('text')
            .attr('class', 'node-text node-year')
            .attr('dy', this.nodeRadius + 35)
            .attr('text-anchor', 'middle')
            .text(yearText);
        }

        // Кнопка добавления для супруга СНИЗУ
        const spouseAddButton = spouseGroup
          .append('g')
          .attr('class', `add-member-btn ${this.isMobile ? 'mobile' : ''}`)
          .attr('transform', `translate(0, ${this.nodeRadius + 60})`) // Позиция четко под узлом
          .on('click', (event: any) => {
            event.stopPropagation();
            this.openAddMemberDialog(node.data.spouse.data);
          });

        spouseAddButton
          .append('circle')
          .attr('class', 'fab-button')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 14);

        spouseAddButton
          .append('text')
          .attr('class', 'fab-icon')
          .attr('x', 0)
          .attr('y', 0)
          .attr('dominant-baseline', 'middle')
          .attr('text-anchor', 'middle')
          .text('+');
      }
    });
    if ((this.root as any).siblings) {
      const siblings = (this.root as any).siblings as TreeNode[];

      // Отрисовываем братьев/сестер на том же уровне, что и корень
      siblings.forEach((siblingNode, index) => {
        const siblingHierarchy = d3.hierarchy(
          siblingNode,
          (d: TreeNode) => d.children
        );
        const siblingTreeData = this.tree(siblingHierarchy);

        // Смещаем братьев/сестер по горизонтали
        const horizontalOffset = (index + 1) * (this.nodeSpacing.x * 2);

        siblingTreeData.descendants().forEach((node: any) => {
          node.x += horizontalOffset;
        });

        // Рисуем поддерево для брата/сестры
        this.renderSubtree(siblingTreeData, nodeGroup, linkGroup);
      });
    }
  }

  private renderSubtree(treeData: any, nodeGroup: any, linkGroup: any): void {
    const nodes = treeData.descendants();

    // Корректируем позиции для супругов
    nodes.forEach((node: any) => {
      if (node.data.spouse) {
        node.data.spouse.x = node.x + this.nodeSpacing.x / 2;
        node.data.spouse.y = node.y;
      }
    });

    // Выравниваем детей с несколькими родителями
    const parentPositionsCache = new Map<string, { x: number; y: number }>();
    nodes.forEach((node: any) => {
      if (node.data.parents && node.data.parents.length > 1) {
        const parentNodes = nodes.filter((n: any) =>
          node.data.parents.some((parent: any) => {
            if (!parent || !parent.data) return false;
            const parentId =
              parent.data.id || (parent.data.data && parent.data.data.id);
            const nodeId = n.data.data.id;
            return parentId === nodeId;
          })
        );

        if (parentNodes.length > 1) {
          parentNodes.sort((a: any, b: any) => a.x - b.x);
          const firstParent = parentNodes[0];
          const lastParent = parentNodes[parentNodes.length - 1];
          const centerX = (firstParent.x + lastParent.x) / 2;
          const centerY = node.y - this.nodeRadius;
          const deltaX = centerX - node.x;
          this.shiftSubtree(node, deltaX);
          parentPositionsCache.set(node.data.data.id, {
            x: centerX,
            y: centerY,
          });
        }
      }
    });

    const links = treeData.links();

    // Уникальный суффикс для этого поддерева
    const subtreeId = `sibling-${Date.now()}-${Math.random()}`;

    // ===== РИСУЕМ СВЯЗИ =====
    linkGroup
      .selectAll(`.link-${subtreeId}`)
      .data(links)
      .enter()
      .append('path')
      .attr('class', `link link-${subtreeId}`)
      .attr('d', (d: any) => {
        const sourceY = d.source.y + this.nodeRadius;
        const targetY = d.target.y - this.nodeRadius;

        let sourceX = d.source.x;
        let sourceYPos = sourceY;

        if (d.source.data.spouse) {
          const spouseX = d.source.x + this.nodeSpacing.x / 2;
          sourceX = (d.source.x + spouseX) / 2;
          sourceYPos = sourceY;
        }

        if (d.target.data.data && d.target.data.data.id) {
          const cachedPosition = parentPositionsCache.get(
            d.target.data.data.id
          );
          if (cachedPosition) {
            sourceX = cachedPosition.x;
            sourceYPos = cachedPosition.y;
          }
        }

        return `M${sourceX},${sourceYPos}
                C${sourceX},${(sourceYPos + targetY) / 2}
                 ${d.target.x},${(sourceYPos + targetY) / 2}
                 ${d.target.x},${targetY}`;
      })
      .style('fill', 'none')
      .style('stroke', 'rgba(255, 255, 255, 0.6)')
      .style('stroke-width', 2)
      .style('opacity', 0.7);

    // ===== РИСУЕМ СВЯЗИ МЕЖДУ СУПРУГАМИ =====
    nodes.forEach((node: any) => {
      if (node.data.spouse) {
        linkGroup
          .append('line')
          .attr('class', `link link-spouse link-${subtreeId}`)
          .attr('x1', node.x + this.nodeRadius)
          .attr('y1', node.y)
          .attr('x2', node.x + this.nodeSpacing.x / 2 - this.nodeRadius)
          .attr('y2', node.y)
          .style('stroke', '#FF69B4')
          .style('stroke-dasharray', '5, 5')
          .style('opacity', 0.8);
      }
    });

    // ===== СОЗДАЕМ ГРУППЫ ДЛЯ УЗЛОВ =====
    const nodeSelection = nodeGroup
      .selectAll(`.node-${subtreeId}`)
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', (d: any) => {
        let classes = `node-group node-${subtreeId}`;
        if (d.data.data.id === this.currentUserId) {
          classes += ' node-current';
        }
        return classes;
      })
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    // ===== ДОБАВЛЯЕМ КРУГИ ДЛЯ УЗЛОВ =====
    nodeSelection
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', this.nodeRadius)
      .style('fill', (d: any) => this.getNodeColor(d.data.data))
      .style('stroke', 'white')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('filter', 'url(#dropshadow)')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        this.onNodeClick(d.data.data);
      });

    // ===== ДОБАВЛЯЕМ ИКОНКУ ПОЛА =====
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-gender')
      .attr('dy', '-8')
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        if (d.data.data.gender === 'male') return '♂';
        if (d.data.data.gender === 'female') return '♀';
        return '⚥';
      })
      .style('fill', 'white')
      .style('font-size', '18px')
      .style('opacity', 0.9);

    // ===== ДОБАВЛЯЕМ ИМЯ =====
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-name')
      .attr('dy', '6')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.data.firstName)
      .style('fill', 'white')
      .style('font-weight', '600')
      .style('font-size', '13px')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.4)');

    // ===== ДОБАВЛЯЕМ ФАМИЛИЮ ПОД УЗЛОМ =====
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-lastname')
      .attr('dy', this.nodeRadius + 20)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.data.lastName)
      .style('fill', 'white')
      .style('font-size', '11px')
      .style('opacity', 0.95)
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.4)');

    // ===== ДОБАВЛЯЕМ ГОД РОЖДЕНИЯ =====
    nodeSelection
      .append('text')
      .attr('class', 'node-text node-year')
      .attr('dy', this.nodeRadius + 35)
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        if (d.data.data.birthDate) {
          const year = new Date(d.data.data.birthDate).getFullYear();
          if (d.data.data.deathDate) {
            const deathYear = new Date(d.data.data.deathDate).getFullYear();
            return `${year} - ${deathYear}`;
          }
          return year;
        }
        return '';
      })
      .style('fill', 'white')
      .style('font-size', '10px')
      .style('opacity', 0.85)
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.4)');

    // ===== ДОБАВЛЯЕМ КНОПКУ ДОБАВЛЕНИЯ ЧЛЕНА СЕМЬИ =====
    const addButtonGroup = nodeSelection
      .append('g')
      .attr('class', `add-member-btn ${this.isMobile ? 'mobile' : ''}`)
      .attr('transform', `translate(0, ${this.nodeRadius + 60})`)
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        this.openAddMemberDialog(d.data.data);
      });

    addButtonGroup
      .append('circle')
      .attr('class', 'fab-button')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 14)
      .style('fill', '#4CAF50')
      .style('filter', 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3))');

    addButtonGroup
      .append('text')
      .attr('class', 'fab-icon')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '1')
      .attr('text-anchor', 'middle')
      .text('+')
      .style('fill', 'white')
      .style('font-size', '22px')
      .style('font-weight', '300');

    // ===== РИСУЕМ УЗЛЫ СУПРУГОВ =====
    nodes.forEach((node: any) => {
      if (node.data.spouse) {
        const spouseX = node.x + this.nodeSpacing.x / 2;
        const spouseY = node.y;

        const spouseGroup = nodeGroup
          .append('g')
          .attr('class', `node-group node-spouse-${subtreeId}`)
          .attr('transform', `translate(${spouseX},${spouseY})`);

        // Круг для супруга
        spouseGroup
          .append('circle')
          .attr('class', 'node-circle')
          .attr('r', this.nodeRadius)
          .style('fill', this.getNodeColor(node.data.spouse.data))
          .style('stroke', 'white')
          .style('stroke-width', 2)
          .style('cursor', 'pointer')
          .style('filter', 'url(#dropshadow)')
          .on('click', (event: any) => {
            event.stopPropagation();
            this.onNodeClick(node.data.spouse.data);
          });

        // Иконка пола супруга
        spouseGroup
          .append('text')
          .attr('class', 'node-text node-gender')
          .attr('dy', '-8')
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.gender === 'male' ? '♂' : '♀')
          .style('fill', 'white')
          .style('font-size', '18px')
          .style('opacity', 0.9);

        // Имя супруга
        spouseGroup
          .append('text')
          .attr('class', 'node-text node-name')
          .attr('dy', '6')
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.firstName)
          .style('fill', 'white')
          .style('font-weight', '600')
          .style('font-size', '13px')
          .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.4)');

        // Фамилия супруга
        spouseGroup
          .append('text')
          .attr('class', 'node-text node-lastname')
          .attr('dy', this.nodeRadius + 20)
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.lastName)
          .style('fill', 'white')
          .style('font-size', '11px')
          .style('opacity', 0.95)
          .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.4)');

        // Год рождения супруга
        if (node.data.spouse.data.birthDate) {
          const birthYear = new Date(
            node.data.spouse.data.birthDate
          ).getFullYear();
          let yearText = birthYear.toString();

          if (node.data.spouse.data.deathDate) {
            const deathYear = new Date(
              node.data.spouse.data.deathDate
            ).getFullYear();
            yearText = `${birthYear} - ${deathYear}`;
          }

          spouseGroup
            .append('text')
            .attr('class', 'node-text node-year')
            .attr('dy', this.nodeRadius + 35)
            .attr('text-anchor', 'middle')
            .text(yearText)
            .style('fill', 'white')
            .style('font-size', '10px')
            .style('opacity', 0.85)
            .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.4)');
        }

        // Кнопка добавления для супруга
        const spouseAddButton = spouseGroup
          .append('g')
          .attr('class', `add-member-btn ${this.isMobile ? 'mobile' : ''}`)
          .attr('transform', `translate(0, ${this.nodeRadius + 60})`)
          .on('click', (event: any) => {
            event.stopPropagation();
            this.openAddMemberDialog(node.data.spouse.data);
          });

        spouseAddButton
          .append('circle')
          .attr('class', 'fab-button')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 14)
          .style('fill', '#4CAF50')
          .style('filter', 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3))');

        spouseAddButton
          .append('text')
          .attr('class', 'fab-icon')
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', '1')
          .attr('text-anchor', 'middle')
          .text('+')
          .style('fill', 'white')
          .style('font-size', '22px')
          .style('font-weight', '300');
      }
    });
  }

  private getNodeColor(member: FamilyMember): string {
    if (member.deathDate) {
      return '#9E9E9E';
    }
    if (member.gender === 'male') return '#42A5F5';
    if (member.gender === 'female') return '#EC407A';
    return '#AB47BC';
  }

  private findNodeById(nodeId: string, node: any): any {
    if (node.data.data.id === nodeId) return node;

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(nodeId, child);
        if (found) return found;
      }
    }

    if (node.data.spouse && node.data.spouse.data.id === nodeId) {
      return { x: node.data.spouse.x, y: node.data.spouse.y };
    }

    return null;
  }

  private shiftSubtree(node: any, deltaX: number): void {
    node.x += deltaX;
    if (node.data && node.data.spouse) {
      node.data.spouse.x += deltaX;
    }
    if (node.children) {
      node.children.forEach((child: any) => this.shiftSubtree(child, deltaX));
    }
  }

  private findNodePosition(
    nodeId: string,
    nodes: any[]
  ): { x: number; y: number } | null {
    const node = nodes.find((n) => n.data.data.id === nodeId);
    if (node) {
      return { x: node.x, y: node.y };
    }
    return null;
  }

  private centerOnNode(nodeId: string): void {
    const hierarchy = d3.hierarchy(this.root!, (d: TreeNode) => d.children);
    const treeData = this.tree(hierarchy);

    const targetNode = this.findNodeById(nodeId, treeData);
    if (!targetNode) return;

    const scale = 1;
    const x = this.width / 2 - targetNode.x * scale;
    const y = this.height / 2 - targetNode.y * scale;

    this.svg
      .transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
  }

  private onNodeClick(member: FamilyMember): void {
    this.familyTreeService.selectMember(member);
    this.navigationService.navigateToProfile(member);
  }

  private openAddMemberDialog(currentMember: FamilyMember): void {
    const dialogRef = this.dialog.open(AddMemberDialogComponent, {
      data: {
        currentMemberId: currentMember.id,
        currentMemberName: `${currentMember.firstName} ${currentMember.lastName}`,
      },
      width: this.isMobile ? '100vw' : '500px',
      maxWidth: this.isMobile ? '100vw' : '90vw',
      height: this.isMobile ? '100vh' : 'auto',
      maxHeight: this.isMobile ? '100vh' : '90vh',
      panelClass: this.isMobile ? 'mobile-dialog' : '',
      hasBackdrop: true,
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const { relationshipType, ...memberData } = result;

        // Создаем нового члена семьи
        const newMemberId = this.familyTreeService.addFamilyMember(memberData);

        // Добавляем связь
        this.familyTreeService.addRelationship(
          currentMember.id,
          newMemberId,
          relationshipType
        );

        // Обновляем дерево
        this.refreshTree();
      }
    });
  }

  zoomIn(): void {
    this.svg.transition().call(this.zoom.scaleBy, 1.3);
  }

  zoomOut(): void {
    this.svg.transition().call(this.zoom.scaleBy, 0.7);
  }

  resetZoom(): void {
    this.svg
      .transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity);
  }

  centerOnCurrentUser(): void {
    if (this.currentUserId) {
      this.centerOnNode(this.currentUserId);
    }
  }
}
