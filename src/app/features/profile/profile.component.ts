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
          [currentMember]="member"
        >
        </app-relationships-list>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-container {
        height: calc(100vh - 64px);
        overflow-y: auto;
        overflow-x: hidden;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        background-attachment: fixed;
      }

      .profile-content {
        padding: 20px;
        min-height: 100%;
        padding-bottom: 60px; /* Увеличен отступ для кнопки добавления */
      }

      @media (max-width: 599px) {
        .profile-container {
          height: calc(100vh - 56px);
        }

        .profile-content {
          padding: 12px;
          padding-bottom: 50px;
        }
      }

      @media (min-width: 600px) and (max-width: 959px) {
        .profile-content {
          padding: 16px;
          padding-bottom: 55px;
        }
      }

      .profile-container {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }

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
    // Подписываемся на изменения в данных семьи
    this.familyTreeService
      .getFamilyMembers()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Обновляем данные при изменениях
        if (this.member) {
          this.loadMemberProfile(this.member.id);
        }
      });

    // Обработка параметров маршрута
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
