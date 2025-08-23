import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FamilyMember } from '../models/family-member.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  constructor(private router: Router) {}

  navigateToProfile(member?: FamilyMember): void {
    if (member) {
      this.router.navigate(['/profile', member.id]);
    } else {
      this.router.navigate(['/profile']);
    }
  }

  navigateToTree(): void {
    this.router.navigate(['/']);
  }
}
