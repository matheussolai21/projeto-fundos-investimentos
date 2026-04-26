import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FoundsService } from './founds.service';

describe('Service: Founds', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
  });

  it('should create service', () => {
    const service = TestBed.inject(FoundsService);
    expect(service).toBeTruthy();
  });
});
