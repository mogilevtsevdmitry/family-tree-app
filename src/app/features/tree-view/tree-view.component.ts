import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeVisualizationComponent } from './components/tree-visualization/tree-visualization.component';
import { TreeControlsComponent } from './components/tree-controls/tree-controls.component';

@Component({
  selector: 'app-tree-view',
  standalone: true,
  imports: [CommonModule, TreeVisualizationComponent, TreeControlsComponent],
  template: `
    <div class="tree-view">
      <app-tree-visualization></app-tree-visualization>
      <app-tree-controls
        (zoomIn)="onZoomIn()"
        (zoomOut)="onZoomOut()"
        (resetZoom)="onResetZoom()"
        (centerOnUser)="onCenterOnUser()"
      >
      </app-tree-controls>
    </div>
  `,
  styles: [
    `
      .tree-view {
        width: 100%;
        height: calc(100vh - 64px);
        position: relative;
        overflow: hidden;
      }
    `,
  ],
})
export class TreeViewComponent {
  @ViewChild(TreeVisualizationComponent)
  treeVisualization!: TreeVisualizationComponent;

  onZoomIn(): void {
    this.treeVisualization?.zoomIn();
  }

  onZoomOut(): void {
    this.treeVisualization?.zoomOut();
  }

  onResetZoom(): void {
    this.treeVisualization?.resetZoom();
  }

  onCenterOnUser(): void {
    this.treeVisualization?.centerOnCurrentUser();
  }
}
