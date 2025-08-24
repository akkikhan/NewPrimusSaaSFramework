import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SharedEventsService {
  private onboardingCompleteSubject = new Subject<{ tenant: any }>();

  onboardingComplete$(): Observable<{ tenant: any }> {
    return this.onboardingCompleteSubject.asObservable();
  }

  emitOnboardingComplete(payload: { tenant: any }) {
    this.onboardingCompleteSubject.next(payload);
  }
}
