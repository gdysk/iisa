import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';

import { MatCard, MatCardHeader, MatCardContent, MatCardTitle } from '@angular/material/card';

import { Subscription } from 'rxjs';

import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { CandidateService } from '../../services/candidate.service';

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  imports: [BaseChartDirective, MatCard, MatCardHeader, MatCardContent, MatCardTitle],
})
export class ChartsComponent implements OnInit, OnDestroy {
  private readonly _candidateService = inject(CandidateService);

  private readonly _subscriptions: Subscription[] = [];

  protected readonly options: ChartConfiguration<'bar'>['options'] = {
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  protected chartData: any;
  protected dataAvailable: boolean = false;

  public ngOnInit(): void {
    this._initCandidatesDataSubscription();
  }

  public ngOnDestroy(): void {
    this._subscriptions.forEach((s) => s.unsubscribe());
  }

  private _initCandidatesDataSubscription(): void {
    let subscription = this._candidateService.getCandidateListObservable().subscribe((list) => {
      this.dataAvailable = list.length > 0;

      this.chartData = computed(() => {
        const buckets = { '18-25': 0, '26-35': 0, '36-50': 0, '51+': 0 };

        for (const candidate of list) {
          if (candidate.age <= 25) buckets['18-25']++;
          else if (candidate.age <= 35) buckets['26-35']++;
          else if (candidate.age <= 50) buckets['36-50']++;
          else buckets['51+']++;
        }

        return {
          labels: Object.keys(buckets),
          datasets: [
            {
              data: Object.values(buckets),
              backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(255, 205, 86, 0.2)', 'rgba(75, 192, 192, 0.2)', 'rgba(54, 162, 235, 0.2)'],
              borderColor: ['rgb(255, 99, 132)', 'rgb(255, 205, 86)', 'rgb(75, 192, 192)', 'rgb(54, 162, 235)'],
              borderWidth: 1,
            },
          ],
        };
      });
    });

    this._subscriptions.push(subscription);
  }
}
