// src/app/shared/components/header/header.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { map } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../material/material-imports';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_IMPORTS],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="navigateToTree()">
        <mat-icon>account_tree</mat-icon>
      </button>

      <!-- Заголовок только для десктопа -->
      <span class="toolbar-title" *ngIf="!isMobile">Семейное древо</span>

      <span class="spacer"></span>

      <!-- Мобильная версия - только иконки -->
      <ng-container *ngIf="isMobile">
        <button
          mat-icon-button
          (click)="navigateToTree()"
          [matTooltip]="'Дерево'"
        >
          <mat-icon>home</mat-icon>
        </button>
        <button
          mat-icon-button
          (click)="navigateToProfile()"
          [matTooltip]="'Профиль'"
        >
          <mat-icon>person</mat-icon>
        </button>
      </ng-container>

      <!-- Десктопная версия - иконки с текстом -->
      <ng-container *ngIf="!isMobile">
        <button mat-button (click)="navigateToTree()">
          <mat-icon>home</mat-icon>
          <span class="button-text">Дерево</span>
        </button>
        <button mat-button (click)="navigateToProfile()">
          <mat-icon>person</mat-icon>
          <span class="button-text">Профиль</span>
        </button>
      </ng-container>
    </mat-toolbar>
  `,
  styles: [
    `
      .spacer {
        flex: 1 1 auto;
      }

      mat-toolbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .toolbar-title {
        margin-left: 8px;
        font-size: 20px;
        font-weight: 500;
      }

      .button-text {
        margin-left: 4px;
      }

      /* Дополнительные стили для мобильных устройств */
      @media (max-width: 599px) {
        mat-toolbar {
          padding: 0 8px;
        }

        button[mat-icon-button] {
          margin: 0 2px;
        }
      }

      /* Стили для планшетов */
      @media (min-width: 600px) and (max-width: 959px) {
        .toolbar-title {
          font-size: 18px;
        }
      }
    `,
  ],
})
export class HeaderComponent implements OnInit, OnDestroy {
  isMobile = false;
  private destroy$ = new Subject<void>();

  constructor(
    private navigationService: NavigationService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    // Отслеживание изменения размера экрана
    this.breakpointObserver
      .observe([
        Breakpoints.Handset,
        Breakpoints.HandsetPortrait,
        Breakpoints.HandsetLandscape,
      ])
      .pipe(
        takeUntil(this.destroy$),
        map((result) => result.matches)
      )
      .subscribe((isMobile) => {
        this.isMobile = isMobile;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateToTree(): void {
    this.navigationService.navigateToTree();
  }

  navigateToProfile(): void {
    this.navigationService.navigateToProfile();
  }
}
