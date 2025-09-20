import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AnalyticsService } from '../../services/analytics.service';

import { CandidatesListComponent } from '../candidates-list/candidates-list.component';
import { ChartsComponent } from '../charts/charts.component';
import { MapComponent } from '../map/map.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [RouterModule, CandidatesListComponent, ChartsComponent, MapComponent],
})
export class DashboardComponent implements OnInit {
  private readonly _analytics = inject(AnalyticsService);

  protected registrations: number | undefined;
  protected visits: number | undefined;

  public ngOnInit(): void {
    this._analytics.getRegistrationsObservable().subscribe((n) => (this.registrations = n));
    this._analytics.getVisitsObservable().subscribe((n) => (this.visits = n));
  }
}
