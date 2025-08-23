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
import { FamilyTreeService } from '../../../../core/services/family-tree.service';
import { UserService } from '../../../../core/services/user.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { TreeNode } from '../../../../core/models/tree-node.model';
import { FamilyMember } from '../../../../core/models/family-member.model';

@Component({
  selector: 'app-tree-visualization',
  standalone: true,
  imports: [CommonModule],
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
        .node {
          transition: all 0.3s ease;

          &:hover {
            circle {
              stroke-width: 4px;
              filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.3));
            }
          }
        }

        .node-current {
          circle {
            stroke: #ffd700 !important;
            stroke-width: 3px !important;
          }
        }

        .link {
          opacity: 0.6;
          fill: none;
          stroke: #ccc;
          stroke-width: 2px;
        }

        .link-spouse {
          stroke: #ff69b4;
          stroke-dasharray: 5, 5;
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

  width = 0;
  height = 0;
  nodeRadius = 35;
  nodeSpacing = { x: 180, y: 200 };

  constructor(
    private familyTreeService: FamilyTreeService,
    private userService: UserService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.initializeDimensions();
    this.initializeSvg();
    this.loadTreeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

    // Добавляем определения для маркеров (стрелки)
    const defs = this.svg.append('defs');

    // Маркер для обычных связей
    defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 45)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    this.g = this.svg.append('g');

    // Настройка зума
    this.zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: any) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // Создание tree layout с большими расстояниями
    this.tree = d3
      .tree<TreeNode>()
      .size([this.width, this.height])
      .nodeSize([this.nodeSpacing.x, this.nodeSpacing.y])
      .separation((a, b) => {
        // Увеличиваем расстояние между узлами с супругами
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

    // Создание группы для связей (рисуется первой, чтобы быть под узлами)
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
        // Размещаем супруга рядом
        node.data.spouse.x = node.x + this.nodeSpacing.x / 2;
        node.data.spouse.y = node.y;
      }
    });

    // Создание связей родитель-ребенок
    const links = treeData.links();

    // Рисование связей
    linkGroup
      .selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        // Кривая Безье для плавных связей
        const sourceY = d.source.y + this.nodeRadius;
        const targetY = d.target.y - this.nodeRadius;

        return `M${d.source.x},${sourceY}
                C${d.source.x},${(sourceY + targetY) / 2}
                 ${d.target.x},${(sourceY + targetY) / 2}
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

    // Создание узлов
    const nodeSelection = nodeGroup
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', (d: any) => {
        let classes = 'node';
        if (d.data.data.id === this.currentUserId) {
          classes += ' node-current';
        }
        return classes;
      })
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .on('click', (event: any, d: any) => this.onNodeClick(d.data.data))
      .style('cursor', 'pointer');

    // Добавление кругов для узлов
    nodeSelection
      .append('circle')
      .attr('r', this.nodeRadius)
      .style('fill', (d: any) => this.getNodeColor(d.data.data))
      .style('stroke', '#fefefe')
      .style('stroke-width', 2);

    // Добавление иконки пола
    nodeSelection
      .append('text')
      .attr('dy', '-5')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Material Icons')
      .attr('font-size', '20px')
      .text((d: any) => {
        if (d.data.data.gender === 'male') return '♂';
        if (d.data.data.gender === 'female') return '♀';
        return '⚥';
      })
      .style('fill', 'white')
      .style('pointer-events', 'none');

    // Добавление имени
    nodeSelection
      .append('text')
      .attr('dy', '10')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.data.firstName)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('pointer-events', 'none');

    // Добавление фамилии под узлом
    nodeSelection
      .append('text')
      .attr('dy', this.nodeRadius + 15)
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.data.lastName)
      .style('font-size', '11px')
      .style('fill', '#fefefe')
      .style('pointer-events', 'none');

    // Добавление года рождения
    nodeSelection
      .append('text')
      .attr('dy', this.nodeRadius + 28)
      .attr('text-anchor', 'middle')
      .text((d: any) => {
        if (d.data.data.birthDate) {
          return new Date(d.data.data.birthDate).getFullYear();
        }
        return '';
      })
      .style('font-size', '10px')
      .style('fill', '#fefefe')
      .style('pointer-events', 'none');

    // Рисование узлов супругов
    nodes.forEach((node: any) => {
      if (node.data.spouse) {
        const spouseNode = nodeGroup
          .append('g')
          .attr('class', 'node')
          .attr(
            'transform',
            `translate(${node.data.spouse.x},${node.data.spouse.y})`
          )
          .on('click', () => this.onNodeClick(node.data.spouse.data))
          .style('cursor', 'pointer');

        spouseNode
          .append('circle')
          .attr('r', this.nodeRadius)
          .style('fill', this.getNodeColor(node.data.spouse.data))
          .style('stroke', '#fefefe')
          .style('stroke-width', 2);

        spouseNode
          .append('text')
          .attr('dy', '-5')
          .attr('text-anchor', 'middle')
          .attr('font-size', '20px')
          .text(node.data.spouse.data.gender === 'male' ? '♂' : '♀')
          .style('fill', 'white')
          .style('pointer-events', 'none');

        spouseNode
          .append('text')
          .attr('dy', '10')
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.firstName)
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .style('fill', 'white')
          .style('pointer-events', 'none');

        spouseNode
          .append('text')
          .attr('dy', this.nodeRadius + 15)
          .attr('text-anchor', 'middle')
          .text(node.data.spouse.data.lastName)
          .style('font-size', '11px')
          .style('fill', '#fefefe')
          .style('pointer-events', 'none');

        if (node.data.spouse.data.birthDate) {
          spouseNode
            .append('text')
            .attr('dy', this.nodeRadius + 28)
            .attr('text-anchor', 'middle')
            .text(new Date(node.data.spouse.data.birthDate).getFullYear())
            .style('font-size', '10px')
            .style('fill', '#fefefe')
            .style('pointer-events', 'none');
        }
      }
    });
  }

  private getNodeColor(member: FamilyMember): string {
    // Особый цвет для умерших
    if (member.deathDate) {
      return '#999999';
    }

    // Цвета по полу
    if (member.gender === 'male') return '#4A90E2';
    if (member.gender === 'female') return '#E91E63';
    return '#9C27B0';
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

  private centerOnNode(nodeId: string): void {
    // Создаем иерархию для поиска узла
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
