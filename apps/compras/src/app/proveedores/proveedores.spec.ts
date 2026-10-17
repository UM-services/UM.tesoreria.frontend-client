import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { API_URL } from '@tesoreria/shared-api';

describe('ProveedoresComponent', () => {
  let component: import('@tesoreria/feature-proveedores').ProveedoresComponent;
  let fixture: ComponentFixture<import('@tesoreria/feature-proveedores').ProveedoresComponent>;

  beforeEach(async () => {
    const { ProveedoresComponent } = await import('@tesoreria/feature-proveedores');

    await TestBed.configureTestingModule({
      imports: [ProveedoresComponent],
      providers: [provideRouter([]), provideHttpClient(), { provide: API_URL, useValue: '' }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
