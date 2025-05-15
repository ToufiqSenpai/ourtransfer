import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendFilesComponent } from './send-files.component';

describe('SendFilesComponent', () => {
  let component: SendFilesComponent;
  let fixture: ComponentFixture<SendFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendFilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
