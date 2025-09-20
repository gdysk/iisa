import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { Observable } from 'rxjs';

const VISITS_KEY = 'iisa_visits';
const REG_KEY = 'iisa_registrations';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly visits = signal<number>(parseInt(localStorage.getItem(VISITS_KEY) ?? '0', 10));
  private readonly registrations = signal<number>(parseInt(localStorage.getItem(REG_KEY) ?? '0', 10));

  private readonly _visits$: Observable<number>;
  private readonly _registrations$: Observable<number>;

  constructor() {
    this._visits$ = toObservable(this.visits);
    this._registrations$ = toObservable(this.registrations);
  }

  public getVisitsObservable(): Observable<number> {
    return this._visits$;
  }

  public getRegistrationsObservable(): Observable<number> {
    return this._registrations$;
  }

  public incrementRegistrations(): void {
    const v = this.registrations() + 1;
    this.registrations.set(v);
    localStorage.setItem(REG_KEY, String(v));
  }

  public incrementVisits(): void {
    const v = this.visits() + 1;
    this.visits.set(v);
    localStorage.setItem(VISITS_KEY, String(v));
  }
}
