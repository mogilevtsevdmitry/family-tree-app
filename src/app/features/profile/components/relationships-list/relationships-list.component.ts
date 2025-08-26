import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../../shared/material/material-imports';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RelationshipView } from '../../../../core/models/relationship.model';
import { FamilyMember } from '../../../../core/models/family-member.model';
import { NavigationService } from '../../../../core/services/navigation.service';
import { FamilyTreeService } from '../../../../core/services/family-tree.service';
import { AddMemberDialogComponent } from '../add-member-dialog/add-member-dialog.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-relationships-list',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ...MATERIAL_IMPORTS],
  template: `
    <mat-card
      class="relationships-card"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <mat-card-header>
        <mat-card-title>Семейные связи</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <mat-list>
          <mat-list-item
            *ngFor="let rel of relationships"
            (click)="navigateToProfile(rel.person.id)"
            class="relationship-item"
          >
            <mat-icon matListItemIcon>{{
              getRelationshipIcon(rel.relationship.type)
            }}</mat-icon>
            <div matListItemTitle>
              {{ rel.person.firstName }} {{ rel.person.lastName }}
            </div>
            <div matListItemLine>
              {{ getRelationshipLabel(rel.relationship.type) }}
            </div>
            <button mat-icon-button matListItemMeta>
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </mat-list-item>

          <mat-list-item *ngIf="relationships.length === 0">
            <div matListItemTitle>Нет связей</div>
            <div matListItemLine>Семейные связи не найдены</div>
          </mat-list-item>
        </mat-list>
      </mat-card-content>

      <!-- Кнопка добавления -->
      <button
        mat-fab
        color="primary"
        class="add-button"
        [class.show]="showAddButton || isMobile"
        (click)="openAddMemberDialog()"
        matTooltip="Добавить члена семьи"
      >
        <mat-icon>add</mat-icon>
      </button>
    </mat-card>
  `,
  styles: [
    `
      .relationships-card {
        max-width: 600px;
        margin: 20px auto;
        position: relative;

        .relationship-item {
          cursor: pointer;
          transition: background-color 0.3s ease;

          &:hover {
            background-color: rgba(103, 58, 183, 0.05);
          }

          mat-icon[matListItemIcon] {
            color: #673ab7;
          }
        }
      }

      .add-button {
        position: absolute;
        bottom: -20px;
        right: 20px;
        transform: scale(0.8);
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.2s ease;
        z-index: 10;

        &.show {
          opacity: 1;
        }

        &:hover {
          transform: scale(0.9);
        }
      }

      @media (max-width: 599px) {
        .add-button {
          bottom: -18px;
          right: 16px;
        }
      }
    `,
  ],
})
export class RelationshipsListComponent implements OnInit {
  @Input() relationships: RelationshipView[] = [];
  @Input() currentMember: FamilyMember | null = null;

  showAddButton = false;
  isMobile = false;

  constructor(
    private navigationService: NavigationService,
    private familyTreeService: FamilyTreeService,
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);
  }

  onMouseEnter(): void {
    if (!this.isMobile) {
      this.showAddButton = true;
    }
  }

  onMouseLeave(): void {
    if (!this.isMobile) {
      this.showAddButton = false;
    }
  }

  getRelationshipLabel(type: string): string {
    const labels: { [key: string]: string } = {
      father: 'Отец',
      mother: 'Мать',
      son: 'Сын',
      daughter: 'Дочь',
      brother: 'Брат',
      sister: 'Сестра',
      spouse: 'Супруг(а)',
      'ex-spouse': 'Бывший супруг(а)',
    };
    return labels[type] || type;
  }

  getRelationshipIcon(type: string): string {
    const icons: { [key: string]: string } = {
      father: 'man',
      mother: 'woman',
      son: 'boy',
      daughter: 'girl',
      brother: 'man',
      sister: 'woman',
      spouse: 'favorite',
      'ex-spouse': 'heart_broken',
    };
    return icons[type] || 'person';
  }

  navigateToProfile(personId: string): void {
    this.navigationService.navigateToProfile({ id: personId } as any);
  }

  openAddMemberDialog(): void {
    if (!this.currentMember) return;

    const dialogRef = this.dialog.open(AddMemberDialogComponent, {
      data: {
        currentMemberId: this.currentMember.id,
        currentMemberName: `${this.currentMember.firstName} ${this.currentMember.lastName}`,
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
        this.addNewMember(result);
      }
    });
  }

  private addNewMember(data: any): void {
    const { relationshipType, ...memberData } = data;

    // Создаем нового члена семьи
    const newMemberId = this.familyTreeService.addFamilyMember(memberData);

    // Добавляем связь
    this.familyTreeService.addRelationship(
      this.currentMember!.id,
      newMemberId,
      relationshipType
    );

    // Обновляем список связей
    this.relationships = this.familyTreeService.getRelationshipsForMember(
      this.currentMember!.id
    );
  }
}
