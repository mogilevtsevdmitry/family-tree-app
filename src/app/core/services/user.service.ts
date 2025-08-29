import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FamilyMember, Gender } from '../models/family-member.model';
import { mockMembers } from './mock-data';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private currentUser$ = new BehaviorSubject<FamilyMember | null>(null);

  constructor() {
    // Моковый текущий пользователь
    this.setCurrentUser(mockMembers[0]);
  }

  getCurrentUser(): Observable<FamilyMember | null> {
    return this.currentUser$.asObservable();
  }

  setCurrentUser(user: FamilyMember): void {
    this.currentUser$.next(user);
  }
}
