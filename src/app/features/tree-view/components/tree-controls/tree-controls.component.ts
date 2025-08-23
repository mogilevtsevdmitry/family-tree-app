import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../../shared/material/material-imports';

@Component({
  selector: 'app-tree-controls',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_IMPORTS],
  template: `
    <div class="tree-controls">
      <button
        mat-fab
        color="primary"
        (click)="onZoomIn()"
        matTooltip="Увеличить"
      >
        <mat-icon>zoom_in</mat-icon>
      </button>
      <button
        mat-fab
        color="primary"
        (click)="onZoomOut()"
        matTooltip="Уменьшить"
      >
        <mat-icon>zoom_out</mat-icon>
      </button>
      <button
        mat-fab
        color="primary"
        (click)="onResetZoom()"
        matTooltip="Сбросить масштаб"
      >
        <mat-icon>fit_screen</mat-icon>
      </button>
      <button
        mat-fab
        color="accent"
        (click)="onCenterOnUser()"
        matTooltip="Центрировать на текущем пользователе"
      >
        <mat-icon>person_pin</mat-icon>
      </button>
    </div>
  `,
  styles: [
    `
      .tree-controls {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 1000;

        button {
          transform: scale(0.8);
        }
      }
    `,
  ],
})
export class TreeControlsComponent {
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() resetZoom = new EventEmitter<void>();
  @Output() centerOnUser = new EventEmitter<void>();

  onZoomIn(): void {
    this.zoomIn.emit();
  }

  onZoomOut(): void {
    this.zoomOut.emit();
  }

  onResetZoom(): void {
    this.resetZoom.emit();
  }

  onCenterOnUser(): void {
    this.centerOnUser.emit();
  }
}
