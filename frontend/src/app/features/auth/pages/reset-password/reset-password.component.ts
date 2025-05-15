import { Component } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel'
import { InputText } from 'primeng/inputtext'
import { Checkbox } from 'primeng/checkbox'
import { Button } from 'primeng/button'

@Component({
  selector: 'app-reset-password',
  imports: [
    FloatLabel,
    InputText,
    Checkbox,
    Button
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {

}
