import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Gender } from '../../../../core/models/family-member.model';
import { MATERIAL_IMPORTS } from '../../../../shared/material/material-imports';

export interface AddMemberDialogData {
  currentMemberId: string;
  currentMemberName: string;
}

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatDatepickerModule,
    ...MATERIAL_IMPORTS,
    MatOption,
  ],
  template: `
    <div class="dialog-container" [class.mobile]="isMobile">
      <h2 mat-dialog-title>
        Добавить члена семьи
        <button
          mat-icon-button
          mat-dialog-close
          class="close-button"
          *ngIf="isMobile"
        >
          <mat-icon>close</mat-icon>
        </button>
      </h2>

      <mat-dialog-content>
        <form [formGroup]="form" class="member-form">
          <!-- Тип связи -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label
              >Кем приходится для {{ data.currentMemberName }}</mat-label
            >
            <mat-select formControlName="relationshipType" required>
              <mat-option value="father">Отец</mat-option>
              <mat-option value="mother">Мать</mat-option>
              <mat-option value="son">Сын</mat-option>
              <mat-option value="daughter">Дочь</mat-option>
              <mat-option value="brother">Брат</mat-option>
              <mat-option value="sister">Сестра</mat-option>
              <mat-option value="spouse">Супруг(а)</mat-option>
            </mat-select>
            <mat-error
              *ngIf="form.get('relationshipType')?.hasError('required')"
            >
              Выберите тип связи
            </mat-error>
          </mat-form-field>

          <!-- Фамилия -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Фамилия</mat-label>
            <input matInput formControlName="lastName" required />
            <mat-error *ngIf="form.get('lastName')?.hasError('required')">
              Фамилия обязательна
            </mat-error>
          </mat-form-field>

          <!-- Имя -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Имя</mat-label>
            <input matInput formControlName="firstName" required />
            <mat-error *ngIf="form.get('firstName')?.hasError('required')">
              Имя обязательно
            </mat-error>
          </mat-form-field>

          <!-- Отчество -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Отчество</mat-label>
            <input matInput formControlName="middleName" />
          </mat-form-field>

          <!-- Пол -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Пол</mat-label>
            <mat-select formControlName="gender">
              <mat-option [value]="Gender.Male">Мужской</mat-option>
              <mat-option [value]="Gender.Female">Женский</mat-option>
              <mat-option [value]="Gender.Other">Другой</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Дата рождения -->
          <mat-form-field appearance="outline" class="full-width">
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

          <!-- Дата смерти -->
          <mat-form-field appearance="outline" class="full-width">
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

          <!-- Профессия -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Профессия</mat-label>
            <input matInput formControlName="occupation" />
          </mat-form-field>

          <!-- Место жительства -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Место жительства</mat-label>
            <input matInput formControlName="location" />
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions [align]="'end'" [class.stretch]="isMobile">
        <button mat-button mat-dialog-close>Отмена</button>
        <button
          mat-raised-button
          color="primary"
          [disabled]="!form.valid"
          (click)="onSubmit()"
        >
          Добавить
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        min-width: 400px;

        &.mobile {
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
          margin: 0;
          padding: 0;
        }
      }

      .close-button {
        position: absolute;
        right: 8px;
        top: 8px;
      }

      mat-dialog-title {
        position: relative;
        margin-bottom: 20px;
      }

      .member-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px 0;
      }

      .full-width {
        width: 100%;
      }

      mat-dialog-content {
        max-height: calc(100vh - 200px);
        overflow-y: auto;

        .mobile & {
          max-height: calc(100vh - 140px);
          padding: 16px;
        }
      }

      mat-dialog-actions {
        padding: 16px;
        gap: 8px;

        &.stretch {
          button {
            flex: 1;
          }
        }
      }
    `,
  ],
})
export class AddMemberDialogComponent implements OnInit {
  form: FormGroup;
  isMobile = false;
  Gender = Gender;

  constructor(
    private fb: FormBuilder,
    private breakpointObserver: BreakpointObserver,
    public dialogRef: MatDialogRef<AddMemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddMemberDialogData
  ) {
    this.form = this.fb.group({
      relationshipType: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      middleName: [''],
      gender: [Gender.Male],
      birthDate: [null],
      deathDate: [null],
      occupation: [''],
      location: [''],
    });
  }

  ngOnInit(): void {
    this.isMobile = this.breakpointObserver.isMatched(Breakpoints.Handset);

    // Автоматически определяем пол по типу связи
    this.form.get('relationshipType')?.valueChanges.subscribe((type) => {
      if (type === 'father' || type === 'son' || type === 'brother') {
        this.form.patchValue({ gender: Gender.Male });
      } else if (
        type === 'mother' ||
        type === 'daughter' ||
        type === 'sister'
      ) {
        this.form.patchValue({ gender: Gender.Female });
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
