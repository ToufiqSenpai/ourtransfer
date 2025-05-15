import { Component } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel'
import { Divider } from 'primeng/divider'
import { Button } from 'primeng/button'
import { NgOptimizedImage } from '@angular/common'
import { Router } from '@angular/router'
import { InputText } from 'primeng/inputtext'

@Component({
  selector: 'app-login',
  imports: [
    FloatLabel,
    Divider,
    Button,
    NgOptimizedImage,
    InputText
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  public constructor(private router: Router) {
  }

  public navigateToPasswordRecovery(): void {
    this.router.navigate(['/auth/password-recovery']);
  }

  public navigateToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }
}
