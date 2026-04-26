/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { FoundsService } from './founds.service';

describe('Service: Founds', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FoundsService]
    });
  });

  it('should ...', inject([FoundsService], (service: FoundsService) => {
    expect(service).toBeTruthy();
  }));
});
