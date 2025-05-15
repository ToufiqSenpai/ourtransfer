import { Component } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel'
import { InputText } from 'primeng/inputtext'
import { Button } from 'primeng/button'
import { Divider } from 'primeng/divider'
import { NgOptimizedImage } from '@angular/common'
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  imports: [
    FloatLabel,
    InputText,
    Button,
    Divider,
    NgOptimizedImage
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  constructor(private router: Router) { }

  public navigateToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
