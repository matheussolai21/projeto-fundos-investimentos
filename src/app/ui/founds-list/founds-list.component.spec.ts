/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { FoundsListComponent } from './founds-list.component';

describe('FoundsListComponent', () => {
  let component: FoundsListComponent;
  let fixture: ComponentFixture<FoundsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FoundsListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FoundsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
