import { Component } from '@angular/core';
import { InputText } from 'primeng/inputtext'
import { FloatLabel } from 'primeng/floatlabel'

@Component({
  selector: 'app-send-files',
  imports: [
    InputText,
    FloatLabel
  ],
  templateUrl: './send-files.component.html',
  styleUrl: './send-files.component.css'
})
export class SendFilesComponent {
  public handleClickAddFiles(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.click()
  }

  public handleClickAddFolder(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;

    input.click()
  }
}
