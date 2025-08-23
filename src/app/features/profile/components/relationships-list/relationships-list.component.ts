import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../../shared/material/material-imports';
import { RelationshipView } from '../../../../core/models/relationship.model';
import { NavigationService } from '../../../../core/services/navigation.service';

@Component({
  selector: 'app-relationships-list',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_IMPORTS],
  template: `
    <mat-card class="relationships-card">
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
    </mat-card>
  `,
  styles: [
    `
      .relationships-card {
        max-width: 600px;
        margin: 20px auto;

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
    `,
  ],
})
export class RelationshipsListComponent {
  @Input() relationships: RelationshipView[] = [];

  constructor(private navigationService: NavigationService) {}

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
}
