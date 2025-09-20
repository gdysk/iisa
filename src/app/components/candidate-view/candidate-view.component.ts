import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';

import { CandidateService } from '../../services/candidate.service';
import { IndexedDBService } from '../../services/indexeddb.service';
import { Candidate } from '../../models/candidate.model';

@Component({
  selector: 'app-candidate-view',
  templateUrl: './candidate-view.component.html',
  imports: [CommonModule, RouterModule, MatIconModule],
})
export class CandidateViewComponent implements OnInit {
  private readonly _route = inject(ActivatedRoute);
  private readonly _candidateService = inject(CandidateService);
  private readonly _idbService = inject(IndexedDBService);

  private _allCandidates: Candidate[] = [];
  private _currIndex: number = 0;

  protected candidate!: Candidate | undefined;
  protected prevEnd: boolean = false;
  protected nextEnd: boolean = false;

  public ngOnInit(): void {
    this._allCandidates = this._candidateService.getAll();
    this._setCandidateInfo();
  }

  private async _setCandidateInfo(): Promise<void> {
    this._allCandidates = await this._addCandidatesPhotos();

    const id = this._route.snapshot.params['id'];
    this.candidate = this._allCandidates.find((c) => c.id == id);

    if (this.candidate) {
      this._currIndex = this._allCandidates.indexOf(this.candidate);
    }

    this.prevEnd = this._currIndex == 0;
    this.nextEnd = this._currIndex == this._allCandidates.length - 1;
  }

  private async _addCandidatesPhotos(): Promise<Candidate[]> {
    const photosArr = await this._idbService.getAllPhotos();

    return this._allCandidates.map((candidate) => {
      const matchingPhoto = photosArr.find((photo) => photo.id === candidate.id);
      if (matchingPhoto) {
        return { ...candidate, imageDataUrl: matchingPhoto.photoBase64 };
      }
      return candidate;
    });
  }

  protected nextCandidate(): void {
    if (this._currIndex < this._allCandidates.length - 1) {
      this._currIndex++;
      this.candidate = this._allCandidates[this._currIndex];
    }

    this._updateNavState();
  }

  protected prevCandidate(): void {
    if (this._currIndex > 0) {
      this._currIndex--;
      this.candidate = this._allCandidates[this._currIndex];
    }

    this._updateNavState();
  }

  private _updateNavState(): void {
    this.prevEnd = this._currIndex === 0;
    this.nextEnd = this._currIndex === this._allCandidates.length - 1;
  }
}
