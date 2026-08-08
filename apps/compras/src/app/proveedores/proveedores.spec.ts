import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('ProveedoresComponent', () => {
  let component: import('@tesoreria/feature-proveedores').ProveedoresComponent;
  let fixture: ComponentFixture<import('@tesoreria/feature-proveedores').ProveedoresComponent>;

  beforeEach(async () => {
    const { ProveedoresComponent } = await import('@tesoreria/feature-proveedores');

    await TestBed.configureTestingModule({
      imports: [ProveedoresComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
