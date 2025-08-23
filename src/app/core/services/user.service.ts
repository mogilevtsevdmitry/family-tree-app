import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FamilyMember, Gender } from '../models/family-member.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private currentUser$ = new BehaviorSubject<FamilyMember | null>(null);

  constructor() {
    // Моковый текущий пользователь
    this.setCurrentUser({
      id: '1',
      firstName: 'Иван',
      lastName: 'Петров',
      gender: Gender.Male,
      birthDate: new Date(1990, 5, 15),
      occupation: 'Инженер',
      location: 'Москва',
    });
  }

  getCurrentUser(): Observable<FamilyMember | null> {
    return this.currentUser$.asObservable();
  }

  setCurrentUser(user: FamilyMember): void {
    this.currentUser$.next(user);
  }
}
