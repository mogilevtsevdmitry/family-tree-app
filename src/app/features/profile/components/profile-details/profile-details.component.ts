import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../../../shared/material/material-imports';
import {
  FamilyMember,
  Gender,
} from '../../../../core/models/family-member.model';
import { FamilyTreeService } from '../../../../core/services/family-tree.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    ...MATERIAL_IMPORTS,
  ],
  template: `
    <mat-card class="profile-card" *ngIf="member">
      <mat-card-header>
        <div mat-card-avatar class="profile-avatar">
          <mat-icon>person</mat-icon>
        </div>
        <mat-card-title>
          <span *ngIf="!isEditing">
            {{ member.firstName }} {{ member.middleName }} {{ member.lastName }}
          </span>
          <span *ngIf="isEditing">Редактирование профиля</span>
        </mat-card-title>
        <mat-card-subtitle *ngIf="!isEditing">
          {{ member.occupation || 'Профессия не указана' }}
        </mat-card-subtitle>
        <span class="spacer"></span>
        <button
          mat-icon-button
          *ngIf="!isEditing"
          (click)="startEditing()"
          matTooltip="Редактировать"
        >
          <mat-icon>edit</mat-icon>
        </button>
      </mat-card-header>

      <mat-card-content>
        <!-- Режим просмотра -->
        <div class="profile-info" *ngIf="!isEditing">
          <div class="info-row">
            <span class="label">Фамилия:</span>
            <span class="value">{{ member.lastName || 'Не указано' }}</span>
          </div>

          <div class="info-row">
            <span class="label">Имя:</span>
            <span class="value">{{ member.firstName || 'Не указано' }}</span>
          </div>

          <div class="info-row">
            <span class="label">Отчество:</span>
            <span class="value">{{ member.middleName || 'Не указано' }}</span>
          </div>

          <div class="info-row">
            <span class="label">Дата рождения:</span>
            <span class="value">{{ formatDate(member.birthDate) }}</span>
          </div>

          <div class="info-row" *ngIf="member.deathDate">
            <span class="label">Дата смерти:</span>
            <span class="value">{{ formatDate(member.deathDate) }}</span>
          </div>

          <div class="info-row" *ngIf="member.birthDate && !member.deathDate">
            <span class="label">Возраст:</span>
            <span class="value">{{ getAge(member.birthDate) }} лет</span>
          </div>

          <div class="info-row">
            <span class="label">Пол:</span>
            <span class="value">
              {{ getGenderLabel(member.gender) }}
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

        <!-- Режим редактирования -->
        <form [formGroup]="editForm" class="edit-form" *ngIf="isEditing">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Фамилия</mat-label>
              <input matInput formControlName="lastName" required />
              <mat-error *ngIf="editForm.get('lastName')?.hasError('required')">
                Фамилия обязательна
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Имя</mat-label>
              <input matInput formControlName="firstName" required />
              <mat-error
                *ngIf="editForm.get('firstName')?.hasError('required')"
              >
                Имя обязательно
              </mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Отчество</mat-label>
              <input matInput formControlName="middleName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Пол</mat-label>
              <mat-select formControlName="gender">
                <mat-option [value]="Gender.Male">Мужской</mat-option>
                <mat-option [value]="Gender.Female">Женский</mat-option>
                <mat-option [value]="Gender.Other">Другой</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Дата рождения</mat-label>
              <input
                matInput
                [matDatepicker]="birthPicker"
                formControlName="birthDate"
              />
              <mat-datepicker-toggle
                matSuffix
                [for]="birthPicker"
              ></mat-datepicker-toggle>
              <mat-datepicker #birthPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Дата смерти</mat-label>
              <input
                matInput
                [matDatepicker]="deathPicker"
                formControlName="deathDate"
              />
              <mat-datepicker-toggle
                matSuffix
                [for]="deathPicker"
              ></mat-datepicker-toggle>
              <mat-datepicker #deathPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Профессия</mat-label>
              <input matInput formControlName="occupation" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Место жительства</mat-label>
              <input matInput formControlName="location" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Биография</mat-label>
            <textarea matInput formControlName="biography" rows="4"></textarea>
          </mat-form-field>
        </form>
      </mat-card-content>

      <!-- Действия в режиме редактирования -->
      <mat-card-actions *ngIf="isEditing" align="end">
        <button mat-button (click)="cancelEditing()">Отмена</button>
        <button
          mat-raised-button
          color="primary"
          (click)="saveChanges()"
          [disabled]="!editForm.valid"
        >
          Сохранить
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      .profile-card {
        max-width: 800px;
        margin: 20px auto;

        mat-card-header {
          position: relative;

          .spacer {
            flex: 1;
          }
        }

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
            padding: 12px 0;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);

            .label {
              font-weight: 500;
              width: 160px;
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
              white-space: pre-wrap;
            }
          }
        }

        .edit-form {
          margin-top: 20px;

          .form-row {
            display: flex;
            gap: 16px;
            margin-bottom: 8px;

            mat-form-field {
              flex: 1;
            }
          }

          .full-width {
            width: 100%;
          }
        }
      }

      @media (max-width: 599px) {
        .edit-form .form-row {
          flex-direction: column;
          gap: 0;
        }
      }
    `,
  ],
})
export class ProfileDetailsComponent implements OnInit, OnChanges {
  @Input() member: FamilyMember | null = null;

  isEditing = false;
  editForm!: FormGroup;
  Gender = Gender;

  constructor(
    private fb: FormBuilder,
    private familyTreeService: FamilyTreeService,
    private snackBar: MatSnackBar
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    if (this.member) {
      this.updateForm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['member'] && this.member) {
      this.updateForm();
      this.isEditing = false;
    }
  }

  private createForm(): void {
    this.editForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      middleName: [''],
      gender: [Gender.Male],
      birthDate: [null],
      deathDate: [null],
      occupation: [''],
      location: [''],
      biography: [''],
    });
  }

  private updateForm(): void {
    if (this.member) {
      this.editForm.patchValue({
        firstName: this.member.firstName,
        lastName: this.member.lastName,
        middleName: this.member.middleName || '',
        gender: this.member.gender,
        birthDate: this.member.birthDate,
        deathDate: this.member.deathDate,
        occupation: this.member.occupation || '',
        location: this.member.location || '',
        biography: this.member.biography || '',
      });
    }
  }

  startEditing(): void {
    this.isEditing = true;
    this.updateForm();
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.updateForm();
  }

  saveChanges(): void {
    if (this.editForm.valid && this.member) {
      const updatedMember: FamilyMember = {
        ...this.member,
        ...this.editForm.value,
      };

      this.familyTreeService.updateFamilyMember(updatedMember);
      this.member = updatedMember;
      this.isEditing = false;

      this.snackBar.open('Профиль успешно обновлен', 'Закрыть', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

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

  getGenderLabel(gender: Gender): string {
    switch (gender) {
      case Gender.Male:
        return 'Мужской';
      case Gender.Female:
        return 'Женский';
      case Gender.Other:
        return 'Другой';
      default:
        return 'Не указано';
    }
  }
}
