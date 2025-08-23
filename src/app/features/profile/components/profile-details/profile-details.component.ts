import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../../../shared/material/material-imports';
import { FamilyMember } from '../../../../core/models/family-member.model';

@Component({
  selector: 'app-profile-details',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_IMPORTS],
  template: `
    <mat-card class="profile-card" *ngIf="member">
      <mat-card-header>
        <div mat-card-avatar class="profile-avatar">
          <mat-icon>person</mat-icon>
        </div>
        <mat-card-title
          >{{ member.firstName }} {{ member.middleName }}
          {{ member.lastName }}</mat-card-title
        >
        <mat-card-subtitle>{{
          member.occupation || 'Профессия не указана'
        }}</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="profile-info">
          <div class="info-row">
            <span class="label">Дата рождения:</span>
            <span class="value">{{ formatDate(member.birthDate) }}</span>
          </div>

          <div class="info-row" *ngIf="member.birthDate">
            <span class="label">Возраст:</span>
            <span class="value">{{ getAge(member.birthDate) }} лет</span>
          </div>

          <div class="info-row">
            <span class="label">Пол:</span>
            <span class="value">
              {{
                member.gender === 'male'
                  ? 'Мужской'
                  : member.gender === 'female'
                  ? 'Женский'
                  : 'Другой'
              }}
            </span>
          </div>

          <div class="info-row" *ngIf="member.location">
            <span class="label">Место жительства:</span>
            <span class="value">{{ member.location }}</span>
          </div>

          <div class="info-row" *ngIf="member.occupation">
            <span class="label">Профессия:</span>
            <span class="value">{{ member.occupation }}</span>
          </div>

          <div class="biography" *ngIf="member.biography">
            <h3>Биография</h3>
            <p>{{ member.biography }}</p>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .profile-card {
        max-width: 600px;
        margin: 20px auto;

        .profile-avatar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;

          mat-icon {
            font-size: 24px;
            width: 24px;
            height: 24px;
            color: white;
          }
        }

        .profile-info {
          margin-top: 20px;

          .info-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);

            .label {
              font-weight: 500;
              width: 150px;
              color: rgba(0, 0, 0, 0.6);
            }

            .value {
              flex: 1;
              color: rgba(0, 0, 0, 0.87);
            }
          }

          .biography {
            margin-top: 20px;

            h3 {
              font-size: 18px;
              margin-bottom: 10px;
              color: rgba(0, 0, 0, 0.87);
            }

            p {
              line-height: 1.6;
              color: rgba(0, 0, 0, 0.6);
            }
          }
        }
      }
    `,
  ],
})
export class ProfileDetailsComponent {
  @Input() member: FamilyMember | null = null;

  getAge(birthDate?: Date): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  formatDate(date?: Date): string {
    if (!date) return 'Не указано';
    return new Date(date).toLocaleDateString('ru-RU');
  }
}
