import { Component } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel'
import { InputText } from 'primeng/inputtext'
import { Button } from 'primeng/button'
import { Router } from '@angular/router'

@Component({
  selector: 'app-password-recovery',
  imports: [
    FloatLabel,
    InputText,
    Button
  ],
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.css'
})
export class PasswordRecoveryComponent {
  public constructor(private router: Router) {
  }

  public navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
