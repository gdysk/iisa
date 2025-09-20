import { AfterViewInit, Component, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';

import { debounceTime, Subscription } from 'rxjs';

import { CandidateService } from '../../services/candidate.service';
import { Candidate } from '../../models/candidate.model';

@Component({
  selector: 'app-candidates-list',
  templateUrl: './candidates-list.component.html',
  styleUrl: './candidates-list.component.css',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatSortModule,
    MatIconModule,
  ],
})
export class CandidatesListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly _candidateService = inject(CandidateService);

  private readonly _sort = viewChild(MatSort);
  private readonly _paginator = viewChild(MatPaginator);

  private readonly _subscriptions: Subscription[] = [];

  private _expandedElement!: Candidate | null;

  protected dataSource!: MatTableDataSource<Candidate>;

  protected readonly columnsToDisplay: string[] = ['name', 'age', 'country', 'phone', 'email'];

  protected searchControl = new FormControl('');

  public ngOnInit(): void {
    this._initCandidatesListSubscription();
    this._initSearchSubscription();
  }

  public ngAfterViewInit(): void {
    if (this.dataSource) {
      this.dataSource.sort = this._sort() || null;

      this.dataSource.paginator = this._paginator() || null;

      this.dataSource.filterPredicate = (data: Candidate, filter: string) => {
        const transformedFilter = filter.trim().toLowerCase();
        const nameMatch = data.name.toLowerCase().includes(transformedFilter);
        const countryMatch = data.country.toLowerCase().includes(transformedFilter);
        const ageMatch = data.age.toString().includes(transformedFilter);
        const phoneMatch = data.phone.toLowerCase().includes(transformedFilter);
        const emailMatch = data.email.toLowerCase().includes(transformedFilter);
        return nameMatch || countryMatch || ageMatch || phoneMatch || emailMatch;
      };
    }
  }

  public ngOnDestroy(): void {
    this._subscriptions.forEach((s) => s.unsubscribe());
  }

  protected isExpanded(element: Candidate): boolean {
    return this._expandedElement === element;
  }

  protected toggle(element: Candidate): void {
    this._expandedElement = this.isExpanded(element) ? null : element;
  }

  protected applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private _initCandidatesListSubscription(): void {
    let subscription = this._candidateService.getCandidateListObservable().subscribe((list) => {
      this.dataSource = new MatTableDataSource(list);
    });

    this._subscriptions.push(subscription);
  }

  private _initSearchSubscription(): void {
    const searchSubscription = this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe((query) => {
      this.applyFilter(query || '');
    });

    this._subscriptions.push(searchSubscription);
  }
}
