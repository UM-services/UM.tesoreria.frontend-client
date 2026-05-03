import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiAuth } from './ui-auth';

describe('UiAuth', () => {
  let component: UiAuth;
  let fixture: ComponentFixture<UiAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiAuth],
    }).compileComponents();

    fixture = TestBed.createComponent(UiAuth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
