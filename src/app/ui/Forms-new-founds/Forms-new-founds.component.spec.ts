/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { FormsNewFoundsComponent } from './Forms-new-founds.component';

describe('FormsNewFoundsComponent', () => {
  let component: FormsNewFoundsComponent;
  let fixture: ComponentFixture<FormsNewFoundsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormsNewFoundsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormsNewFoundsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
