// src/app/features/profile/profile.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FamilyMember } from '../../core/models/family-member.model';
import { RelationshipView } from '../../core/models/relationship.model';
import { FamilyTreeService } from '../../core/services/family-tree.service';
import { UserService } from '../../core/services/user.service';
import { ProfileDetailsComponent } from './components/profile-details/profile-details.component';
import { RelationshipsListComponent } from './components/relationships-list/relationships-list.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ProfileDetailsComponent, RelationshipsListComponent],
  template: `
    <div class="profile-container">
      <div class="profile-content">
        <app-profile-details [member]="member"></app-profile-details>
        <app-relationships-list
          [relationships]="relationships"
        ></app-relationships-list>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-container {
        /* Изменено с min-height на height для правильного скроллинга */
        height: calc(100vh - 64px); /* 64px - высота toolbar */
        overflow-y: auto; /* Включаем вертикальный скролл */
        overflow-x: hidden; /* Отключаем горизонтальный скролл */
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        background-attachment: fixed; /* Фиксируем градиент при скролле */
      }

      .profile-content {
        padding: 20px;
        min-height: 100%; /* Минимальная высота контента */
        padding-bottom: 40px; /* Дополнительный отступ снизу */
      }

      /* Адаптивные стили для мобильных устройств */
      @media (max-width: 599px) {
        .profile-container {
          height: calc(100vh - 56px); /* Меньшая высота toolbar на мобильных */
        }

        .profile-content {
          padding: 12px;
          padding-bottom: 30px;
        }
      }

      /* Стили для планшетов */
      @media (min-width: 600px) and (max-width: 959px) {
        .profile-content {
          padding: 16px;
          padding-bottom: 35px;
        }
      }

      /* Улучшение производительности скролла */
      .profile-container {
        -webkit-overflow-scrolling: touch; /* Плавный скролл на iOS */
        scroll-behavior: smooth; /* Плавная прокрутка */
      }

      /* Кастомная полоса прокрутки для webkit браузеров */
      .profile-container::-webkit-scrollbar {
        width: 8px;
      }

      .profile-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
      }

      .profile-container::-webkit-scrollbar-thumb {
        background: rgba(103, 58, 183, 0.5);
        border-radius: 4px;
        transition: background 0.3s ease;
      }

      .profile-container::-webkit-scrollbar-thumb:hover {
        background: rgba(103, 58, 183, 0.7);
      }

      /* Стили для Firefox */
      .profile-container {
        scrollbar-width: thin;
        scrollbar-color: rgba(103, 58, 183, 0.5) rgba(0, 0, 0, 0.1);
      }
    `,
  ],
})
export class ProfileComponent implements OnInit, OnDestroy {
  member: FamilyMember | null = null;
  relationships: RelationshipView[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private familyTreeService: FamilyTreeService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const memberId = params['id'];
      if (memberId) {
        this.loadMemberProfile(memberId);
      } else {
        this.loadCurrentUserProfile();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMemberProfile(memberId: string): void {
    const member = this.familyTreeService.getMemberById(memberId);
    if (member) {
      this.member = member;
      this.relationships =
        this.familyTreeService.getRelationshipsForMember(memberId);
    }
  }

  private loadCurrentUserProfile(): void {
    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.member = user;
          this.relationships = this.familyTreeService.getRelationshipsForMember(
            user.id
          );
        }
      });
  }
}
